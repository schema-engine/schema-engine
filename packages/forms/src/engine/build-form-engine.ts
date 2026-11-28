import { globalFetch, withCsrf, type CsrfPolicy, type FormFetch } from '@/lib/form-fetch.js';
import type { FormIssueFormatter } from '@/state-container/types.js';
import { assertStandardSchema, createRegistry, RegistryError } from '@schema-engine/registry';
import type { AnyElementRegistration, AnyRecipeRegistration, AnyActionRegistration } from '@/types/registration.js';
import type {
	ActionRegistrationConstraint,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
} from '@/builder/types.utils.js';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types.js';
import { FormEngine } from '@/engine/form-engine.js';
import { ComponentType } from '@/engine/component-type.js';
import { createActionExportSchemaMap, createFormEngineSchemaArtifacts } from '@/engine/schema-artifacts.js';
import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog.js';
import { logger } from '@/lib/logger.js';
import { ELEMENT_CHILDREN_KEY } from '@/lib/element-children.js';
import { withExportedRules } from '@/lib/exported-rules.js';
import { withActionEnvelope } from '@/lib/exported-action-envelope.js';
import {
	assertAxesNotReserved,
	createAppearanceSchema,
	createLayoutTheme,
	getDefaultLayoutTheme,
	isLayoutTheme,
	withAppearanceAxes,
	withSlotAppearanceAxes,
	type LayoutInput,
	type LayoutTheme,
} from '@schema-engine/layout';
import { RENDERER_DATA_ATTRIBUTES } from '@/lib/renderer-data-attributes.js';
import { createFormConfigShape } from '@/schemas/form-config-shape.js';
import * as z from 'zod/mini';
import { resolveExportSchema } from '@/lib/export-schema.js';
import { createExportedRecipeView } from '@/lib/exported-recipe-view.js';
import { assertDefaultWizardRecipe, createFormRecipeRegistry } from '@/recipes/protocol.js';
import { createDefaultValidationRegistry, type ValidationRegistry } from '@/schemas/validation/index.js';

/**
 * Rejects an element registration that states no `kind`, a container that breaks the child path rule, and an input that
 * declares neither `childPaths` nor `value`, which types forbid but a hand-written object does not.
 *
 * @throws {RegistryError} Code `'invalid-child-paths'` for `childPaths` forms does not read (on a static element, more
 * than one path, a key other than `elements`, no `list: true`) and for `containerKind` without `childPaths`, and code
 * `'invalid-declaration'` for a registration that states no `kind`, an input that declares neither `value` nor
 * `childPaths`, and a container that declares a `value`
 *
 * @remarks
 * `defineInput` and `defineStatic` set `kind`, which is what says whether an element holds a value: its metadata is for display and is never read here.
 * A registration written without the helpers states its `kind`.
 *
 * Only an input can be a container, and it declares one child path, `[{ keys: ['elements'], list: true }]` with an optional
 * `accepts`, since value paths, field scopes, grids and the submission shape all read `elements`. Its value is its
 * children's, so it declares no `value`, and `containerKind` only says whether they make an object or a list of rows,
 * so it needs `childPaths` beside it. Any other `input` declares `value`. A `static` element holds neither.
 */
function assertElementDeclarations(registration: ElementRegistrationConstraint): void {
	const { $type, childPaths } = registration;
	const kind: unknown = registration.kind;
	const invalid = (
		code: 'invalid-child-paths' | 'invalid-declaration',
		message: string,
		childPath?: readonly string[],
	) =>
		new RegistryError(code, message, { kind: 'Element', $type, ...(childPath === undefined ? {} : { childPath }) });
	if (kind !== 'input' && kind !== 'static') {
		throw invalid(
			'invalid-declaration',
			`Element '${$type}' states no kind. Build it with \`defineInput\` or \`defineStatic\`, or set \`kind: 'input'\` (it holds a value or children) or \`kind: 'static'\` (display only) on a registration written by hand.`,
		);
	}
	if (registration.kind === 'static') {
		if (childPaths === undefined) return;
		throw invalid(
			'invalid-child-paths',
			`Element '${$type}' is a static element that declares childPaths: only an input can hold children. Make it an input with \`defineInput\`, or drop its childPaths.`,
			childPaths[0]?.keys,
		);
	}
	if (childPaths === undefined) {
		if (registration.containerKind !== undefined) {
			throw invalid(
				'invalid-child-paths',
				`Element '${$type}' sets containerKind without childPaths. A container declares \`childPaths: [{ keys: ['${ELEMENT_CHILDREN_KEY}'], list: true }]\`; containerKind only says whether its children make an object or a list of rows.`,
			);
		}
		if (typeof registration.value === 'function') return;
		throw invalid(
			'invalid-declaration',
			`Element '${$type}' is an input that declares no value. Give it \`value: (config) => schema\`, the value its control writes. An input that holds children declares \`childPaths: [{ keys: ['${ELEMENT_CHILDREN_KEY}'], list: true }]\` and \`${ELEMENT_CHILDREN_KEY}\` in its schema instead. A display-only element is made with \`defineStatic\`.`,
		);
	}
	const [path, ...others] = childPaths;
	if (others.length > 0) {
		throw invalid(
			'invalid-child-paths',
			`Element '${$type}' declares ${childPaths.length} child paths. Forms reads one, \`{ keys: ['${ELEMENT_CHILDREN_KEY}'], list: true }\`, so a container holds its children in one place.`,
			others[0]?.keys,
		);
	}
	if (path?.keys.length !== 1 || path.keys[0] !== ELEMENT_CHILDREN_KEY) {
		throw invalid(
			'invalid-child-paths',
			`Element '${$type}' must hold its children under '${ELEMENT_CHILDREN_KEY}', not '${path?.keys.join('.')}': it is the one child path forms reads.`,
			path?.keys,
		);
	}
	if (path.list !== true) {
		throw invalid(
			'invalid-child-paths',
			`Element '${$type}' must declare its child path with \`list: true\`: \`{ keys: ['${ELEMENT_CHILDREN_KEY}'], list: true }\`. Forms reads \`${ELEMENT_CHILDREN_KEY}\` only as a list, so a value that is not one is an issue and the export types the slot as a list.`,
			path.keys,
		);
	}
	if (registration.value !== undefined) {
		throw invalid(
			'invalid-declaration',
			`Element '${$type}' is a container that declares a value. The value of a container is its children's, so drop \`value\`.`,
		);
	}
}

function createUnionSchema(schemas: z.ZodMiniType[]): z.ZodMiniType {
	if (schemas.length === 0) {
		return z.never();
	}
	if (schemas.length === 1) {
		return schemas[0];
	}
	return z.union(schemas as [z.ZodMiniType, z.ZodMiniType, ...z.ZodMiniType[]]);
}

/**
 * What a registration contributes to the schema catalog and the JSON Schema export: its `$type`,
 * its own validator schema, the schema the export lists it by, and its catalog metadata.
 */
type ExportRegistration = {
	$type: string;
	schema: unknown;
	exportSchema: z.ZodMiniType;
	metadata: { name: string; description?: string; category?: string };
};

/** The union of what the export lists the registrations of one kind by, for the form config. */
function createRegistrationSchema(registrations: ExportRegistration[]): z.ZodMiniType {
	return createUnionSchema(registrations.map((registration) => registration.exportSchema));
}

/**
 * The open object the export lists a registration by when it cannot read its schema: its `$type`, the
 * `appearance` it may pick when it has one, and the key of its children when it holds any.
 *
 * @remarks
 * Every registration kind is listed this way, so each is a definition of the document and an entry of the collection
 * like one that exports itself, and a container's slot can be typed there. The slot is an optional list with open
 * items, which the export then types by what the container accepts (see `composeDocumentChildSlots`), since forms
 * reads `elements` only as a list, whatever the container's `containerKind`, and reports an issue for anything else.
 */
function createOpenEnvelope($type: string, appearance?: z.ZodMiniType, holdsChildren = false): z.ZodMiniType {
	return z.looseObject({
		$type: z.literal($type),
		...(appearance ? { appearance: z.optional(appearance) } : {}),
		...(holdsChildren ? { [ELEMENT_CHILDREN_KEY]: z.optional(z.array(z.unknown())) } : {}),
	});
}

/**
 * The schema the JSON Schema export lists a recipe by, with each slot's `appearance` closed over the axes it declares.
 *
 * @remarks
 * A recipe with `slotSchemas` is exported from them, because its own schema is a Standard Schema that can come from
 * any library; see {@link createExportedRecipeView}. One without them (written by hand) is read from its own schema
 * by {@link resolveExportSchema}, and listed by its `$type` alone when the export cannot read it.
 */
function exportedRecipeView(recipe: AnyRecipeRegistration, layout: LayoutTheme): z.ZodMiniType {
	const slotAxes: Readonly<Record<string, readonly string[] | undefined>> = recipe.appearanceAxes ?? {};
	if (recipe.slotSchemas) {
		const view = createExportedRecipeView(recipe.$type, recipe.slotSchemas, (slot) =>
			withAppearanceAxes(z.looseObject({}), layout.appearance, slotAxes[slot]),
		);
		return withSlotAppearanceAxes(view, layout.appearance, slotAxes);
	}
	const source = resolveExportSchema(recipe.schema, () => createOpenEnvelope(recipe.$type));
	if (source.kind === 'zod') return withSlotAppearanceAxes(source.schema, layout.appearance, recipe.appearanceAxes);
	return source.kind === 'standard' ? source.schema : createOpenEnvelope(recipe.$type);
}

/**
 * The registrations of one registry as the JSON Schema export lists them: the schema of an element
 * or recipe is closed over the axes it declares, built from the layout theme's axes.
 *
 * @remarks
 * Validation parses the registration's own schema, and the catalog keeps associating it, so only
 * the export sees the closed one. Computed once per registration, so the form config union and the
 * metadata registry hold the same schema object and the export refers to it by its id.
 *
 * An element whose schema the export cannot read is listed by an open envelope that holds its `$type`, the axes it
 * declares, because a pick is checked whatever the schema, and its children key when it is a container. Its children
 * are typed with those of every other container, after conversion (see `composeDocumentChildSlots`).
 *
 * With `ruleSchema`, an element's `rules` are typed as that schema, so the export lists each registered rule.
 */
function toExportRegistrations(
	registrations: Iterable<AnyElementRegistration | AnyRecipeRegistration | AnyActionRegistration>,
	componentType: ComponentType,
	layout: LayoutTheme,
	ruleSchema?: z.ZodMiniType,
): ExportRegistration[] {
	return Array.from(registrations, (registration) => ({
		$type: registration.$type,
		schema: registration.schema,
		exportSchema: exportSchemaOf(registration, componentType, layout, ruleSchema),
		metadata: registration.metadata,
	}));
}

/** The schema the export lists one registration by, see {@link toExportRegistrations}. */
function exportSchemaOf(
	registration: AnyElementRegistration | AnyRecipeRegistration | AnyActionRegistration,
	componentType: ComponentType,
	layout: LayoutTheme,
	ruleSchema?: z.ZodMiniType,
): z.ZodMiniType {
	if (componentType === ComponentType.Recipe)
		return exportedRecipeView(registration as AnyRecipeRegistration, layout);
	const openEnvelope = () => {
		if (componentType !== ComponentType.Element) {
			const envelope = createOpenEnvelope(registration.$type);
			return componentType === ComponentType.Action ? withActionEnvelope(envelope, registration.$type) : envelope;
		}
		const element = registration as AnyElementRegistration;
		return createOpenEnvelope(
			element.$type,
			createAppearanceSchema(layout.appearance, element.appearanceAxes ?? []),
			element.childPaths !== undefined,
		);
	};
	const source = resolveExportSchema(registration.schema, openEnvelope);
	if (source.kind === 'standard') return source.schema;
	if (source.kind === 'open') return openEnvelope();
	if (componentType !== ComponentType.Element) return withActionEnvelope(registration.schema, registration.$type);
	const withAppearance = withAppearanceAxes(
		registration.schema,
		layout.appearance,
		(registration as AnyElementRegistration).appearanceAxes,
	);
	return ruleSchema ? withExportedRules(withAppearance, ruleSchema) : withAppearance;
}

/** The id the JSON Schema export defines the rule union by, so each element refers to it. */
const RULE_EXPORT_ID = 'validation-rule';

/**
 * The schema of a rule as the JSON Schema export lists it: any one of the registered rules, each by
 * its own schema, so a custom rule and a replaced built-in show the options their registration declares.
 *
 * @remarks
 * Each rule's schema is read by {@link resolveExportSchema}: one the export cannot read is listed by its `$type`
 * alone, with no options. The union is built once and carries an id in the metadata registry, so the export defines
 * it once and each element refers to it.
 */
function createRuleExportSchema(validations: ValidationRegistry): z.ZodMiniType {
	return createUnionSchema(
		validations.all().map((registration) => {
			const open = () => createOpenEnvelope(registration.$type);
			const source = resolveExportSchema(registration.schema, open);
			return source.kind === 'open' ? open() : source.schema;
		}),
	);
}

function createFormConfigSchema(
	elementsUnion: z.ZodMiniType,
	recipes: ExportRegistration[],
	actions: ExportRegistration[],
	layout: LayoutTheme,
) {
	const recipesUnion = createRegistrationSchema(recipes);
	const actionsUnion = createRegistrationSchema(actions);

	return createFormConfigShape({
		elements: elementsUnion,
		view: recipes.length > 0 ? recipesUnion : z.never(),
		actions: actionsUnion,
		appearance: createAppearanceSchema(layout.appearance),
	});
}

/**
 * Writes a registration's catalog entry, keyed by {@link SchemaMetadataCatalog.entryId}.
 *
 * @remarks
 * Overwrites any existing entry for that id, so an overriding registration's
 * title and description follow the same last-wins rule as the registration.
 */
function registerSchemaMetadata(
	catalog: SchemaMetadataCatalog,
	componentType: ComponentType,
	registration: Pick<ExportRegistration, '$type' | 'schema' | 'metadata'>,
): void {
	const id = SchemaMetadataCatalog.entryId(componentType, registration.$type);
	catalog.register(assertStandardSchema(registration.schema, `Registration '${id}' schema`), {
		id,
		componentType,
		title: registration.metadata.name,
		description: registration.metadata.description,
		category: registration.metadata.category,
	});
}

/**
 * Rejects an axis a registration declares that the layout theme's axis registry does not hold, so a
 * typo such as `'sise'` fails the build instead of silently making the axis unsupported.
 */
function assertDeclaredAxes(
	owner: string,
	axes: readonly string[] | undefined,
	layout: LayoutTheme,
	createError: (message: string) => Error,
): void {
	for (const axis of axes ?? []) {
		if (!layout.appearance.has(axis)) {
			throw createError(
				`${owner} declares unknown appearance axis '${axis}'. Declared axes: ${layout.appearance.keys().join(', ')}. Add it with createFormEngine({ layout: { appearance: [...builtInAxes, defineAxis({ $type: '${axis}', ... })] } }).`,
			);
		}
	}
}

export type FormEngineRegistrationLists = {
	elements?: readonly ElementRegistrationConstraint[];
	recipes?: readonly RecipeRegistrationConstraint[];
	actions?: readonly ActionRegistrationConstraint[];
	validations?: readonly ValidationRegistrationConstraint[];
	catalog?: SchemaMetadataCatalog;
	defaultWizardRecipe?: string;
	formatIssue?: FormIssueFormatter;
	layout?: LayoutInput;
	fetch?: FormFetch;
	csrf?: CsrfPolicy;
};

/**
 * The layout theme an engine runs on: the library default, a theme compiled elsewhere, or one
 * compiled from inline options.
 *
 * @remarks
 * Forms passes its renderer attributes as `reservedNames`, so an axis cannot overwrite a
 * `data-se-*` attribute a renderer writes. A theme compiled elsewhere skipped that check, so it is
 * re-checked here.
 *
 * A value that is not a compiled theme must be `{ grid, appearance }` options and nothing else. A
 * spread copy or a JSON copy of a theme has `id`, `axes` and `css` keys and lost its brand (a
 * structured clone of one throws instead, because the theme holds functions);
 * compiling it as options would drop its appearance axes and change its id without a word, so it
 * throws instead.
 */
function resolveLayout(layout: LayoutInput | undefined): LayoutTheme {
	if (layout === undefined) return getDefaultLayoutTheme();
	if (isLayoutTheme(layout)) {
		assertAxesNotReserved(layout, RENDERER_DATA_ATTRIBUTES);
		return layout;
	}
	for (const key of Object.keys(layout)) {
		if (key !== 'grid' && key !== 'appearance') {
			throw new Error(
				`Invalid layout option: unknown key '${key}'. layout takes a theme from createLayoutTheme or { grid, appearance } options. If this is a copy of a compiled theme, pass the compiled theme itself, not a copy.`,
			);
		}
	}
	return createLayoutTheme(layout, { reservedNames: RENDERER_DATA_ATTRIBUTES });
}

/**
 * Single construction path for {@link createFormEngine} and {@link FormEngine.extend}.
 * Later duplicate `$type` values overwrite earlier ones (last-wins).
 */
export function buildFormEngine(lists: FormEngineRegistrationLists) {
	const layout = resolveLayout(lists.layout);
	const elementRegistry = createRegistry('Element', (lists.elements ?? []) as readonly AnyElementRegistration[], {
		hint: 'Register it with createFormEngine({ elements: [...] }).',
	});
	for (const registration of lists.elements ?? []) assertElementDeclarations(registration);
	const recipeRegistry = createFormRecipeRegistry((lists.recipes ?? []) as readonly AnyRecipeRegistration[], {
		hint: 'Register it with createFormEngine({ recipes: [...] }).',
	});
	const actionRegistry = createRegistry('Action', (lists.actions ?? []) as readonly AnyActionRegistration[], {
		hint: 'Register it with createFormEngine({ actions: [...] }).',
	});

	for (const element of elementRegistry.all()) {
		assertDeclaredAxes(`Element '${element.$type}'`, element.appearanceAxes, layout, Error);
	}
	for (const recipe of recipeRegistry.all()) {
		for (const [slot, axes] of Object.entries(recipe.appearanceAxes ?? {})) {
			assertDeclaredAxes(
				`Recipe '${recipe.$type}' slot '${slot}'`,
				axes,
				layout,
				(message) => new RegistryError('invalid-declaration', message, { kind: 'Recipe', $type: recipe.$type }),
			);
		}
	}

	const validations = Object.freeze([...(lists.validations ?? [])]);
	const requestFetch = lists.csrf ? withCsrf(lists.fetch ?? globalFetch, lists.csrf) : (lists.fetch ?? globalFetch);
	const validationRegistry = createDefaultValidationRegistry(
		[
			...collectElementValidations(elementRegistry.all() as readonly ElementRegistrationConstraint[]),
			...validations,
		],
		{ fetch: requestFetch },
	);

	assertDefaultWizardRecipe(recipeRegistry, lists.defaultWizardRecipe);

	logger.debug('Building FormEngine', {
		elements: elementRegistry.size,
		recipes: recipeRegistry.size,
		actions: actionRegistry.size,
	});

	const ruleSchema = createRuleExportSchema(validationRegistry);
	const exportedElements = toExportRegistrations(elementRegistry.all(), ComponentType.Element, layout, ruleSchema);
	const exportedRecipes = toExportRegistrations(recipeRegistry.all(), ComponentType.Recipe, layout);
	const exportedActions = toExportRegistrations(actionRegistry.all(), ComponentType.Action, layout);

	const exportSchemas = new Map<string, z.ZodMiniType>();
	for (const [componentType, exported] of [
		[ComponentType.Element, exportedElements],
		[ComponentType.Recipe, exportedRecipes],
		[ComponentType.Action, exportedActions],
	] as const) {
		for (const item of exported) {
			if (item.exportSchema !== item.schema) {
				exportSchemas.set(SchemaMetadataCatalog.entryId(componentType, item.$type), item.exportSchema);
			}
		}
	}

	const metadataCatalog = lists.catalog?.clone() ?? new SchemaMetadataCatalog();
	for (const [componentType, registrations] of [
		[ComponentType.Element, exportedElements],
		[ComponentType.Recipe, exportedRecipes],
		[ComponentType.Action, exportedActions],
		[ComponentType.Axis, layout.appearance.all()],
	] as const) {
		for (const item of registrations) {
			registerSchemaMetadata(metadataCatalog, componentType, item);
		}
	}

	const elementsUnion = createRegistrationSchema(exportedElements);
	const formConfigSchema = createFormConfigSchema(elementsUnion, exportedRecipes, exportedActions, layout);
	const actionExportSchemas = createActionExportSchemaMap(exportedActions);
	const schemaArtifacts = createFormEngineSchemaArtifacts(
		metadataCatalog,
		formConfigSchema,
		elementRegistry.all(),
		actionExportSchemas,
		exportSchemas,
		[
			{
				schema: ruleSchema,
				metadata: {
					id: RULE_EXPORT_ID,
					title: 'Validation rule',
					description: 'Any one of the rules the engine registers, with its options.',
					componentType: ComponentType.Validation,
				},
			},
		],
	);

	return new FormEngine({
		elements: elementRegistry,
		recipes: recipeRegistry,
		actions: actionRegistry,
		schemaArtifacts,
		layout,
		validationRegistry,
		validations,
		defaultWizardRecipe: lists.defaultWizardRecipe,
		formatIssue: lists.formatIssue,
		fetch: requestFetch,
		baseFetch: lists.fetch,
		csrf: lists.csrf,
	});
}

/**
 * Validations declared by the winning element of each `$type`, in the element registry's order.
 *
 * @remarks
 * An element replaced by a later one with the same `$type` contributes nothing. The order is the
 * registry's: a replaced `$type` keeps the position of its first registration, as it does for
 * every other lookup. When two elements declare the same validation `$type`, the one later in that
 * order wins. {@link FormEngine.extend} rebuilds from the same registry order, so an extended
 * engine with no new elements keeps the same winner.
 */
function collectElementValidations(
	elements: readonly ElementRegistrationConstraint[],
): ValidationRegistrationConstraint[] {
	return elements.flatMap((element) => element.validations ?? []);
}
