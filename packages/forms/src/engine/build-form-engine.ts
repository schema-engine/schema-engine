import type { FormIssueFormatter } from '@/state-container/types';
import { createRegistry } from '@schema-engine/registry';
import type { AnyElementRegistration, AnyRecipeRegistration, AnyActionRegistration } from '@/types/registration';
import type {
	ActionRegistrationConstraint,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
} from '@/builder/types.utils';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types';
import { FormEngine } from '@/engine/form-engine';
import { ComponentType } from '@/engine/component-type';
import { createActionConfigValidatorMap, createFormEngineSchemaArtifacts } from '@/engine/schema-artifacts';
import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog';
import { logger } from '@/lib/logger';
import { withExportedChildren } from '@/lib/element-children';
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
import { RENDERER_DATA_ATTRIBUTES } from '@/lib/renderer-data-attributes';
import { createFormConfigShape } from '@/schemas/form-config-shape';
import * as z from 'zod/mini';
import { isZodType } from '@/lib/zod-json-schema';
import { assertDefaultWizardRecipe, createFormRecipeRegistry } from '@/recipes/protocol';
import { assertStandardSchema } from '@/lib/standard-schema';
import { createDefaultValidationRegistry } from '@/schemas/validation';

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
	exportSchema: unknown;
	metadata: { name: string; description?: string; category?: string };
	/** Axes declared by an element, so a native Standard Schema envelope can list them. */
	appearanceAxes?: readonly string[];
};

/**
 * JSON Schema / authoring union. Zod registrations keep their full schema.
 * Native Standard Schema registrations contribute a literal `$type` envelope
 * so mixed engines do not silently drop supported types; an element's envelope
 * also lists the axes it declares, because a pick is checked whatever the schema.
 */
function createRegistrationSchema(
	registrations: ExportRegistration[],
	envelopeAppearance?: (registration: ExportRegistration) => z.ZodMiniType,
): z.ZodMiniType {
	const parts = registrations.map((registration) => {
		if (isZodType(registration.exportSchema)) return registration.exportSchema;
		return z.looseObject({
			$type: z.literal(registration.$type),
			...(envelopeAppearance ? { appearance: z.optional(envelopeAppearance(registration)) } : {}),
		});
	});
	return createUnionSchema(parts);
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
 * With `childSchema`, an element that holds an `elements` array has its children typed as that schema,
 * the lazy union of every element's export schema, so a child gets the same closed `appearance` as a
 * top-level element. The union is lazy because it contains the container itself.
 */
function toExportRegistrations(
	registrations: Iterable<AnyElementRegistration | AnyRecipeRegistration | AnyActionRegistration>,
	componentType: ComponentType,
	layout: LayoutTheme,
	childSchema?: z.ZodMiniType,
): ExportRegistration[] {
	return Array.from(registrations, (registration) => {
		const exported: ExportRegistration = {
			$type: registration.$type,
			schema: registration.schema,
			exportSchema: registration.schema,
			metadata: registration.metadata,
		};
		if (!isZodType(registration.schema)) {
			if (componentType === ComponentType.Element) {
				exported.appearanceAxes = (registration as AnyElementRegistration).appearanceAxes ?? [];
			}
			return exported;
		}
		if (componentType === ComponentType.Element) {
			const withAppearance = withAppearanceAxes(
				registration.schema,
				layout.appearance,
				(registration as AnyElementRegistration).appearanceAxes,
			);
			exported.exportSchema = childSchema ? withExportedChildren(withAppearance, childSchema) : withAppearance;
		} else if (componentType === ComponentType.Recipe) {
			exported.exportSchema = withSlotAppearanceAxes(
				registration.schema,
				layout.appearance,
				(registration as AnyRecipeRegistration).appearanceAxes,
			);
		}
		return exported;
	});
}

function createElementsUnion(elements: ExportRegistration[], layout: LayoutTheme): z.ZodMiniType {
	return createRegistrationSchema(elements, (element) =>
		createAppearanceSchema(layout.appearance, element.appearanceAxes),
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
function assertDeclaredAxes(owner: string, axes: readonly string[] | undefined, layout: LayoutTheme): void {
	for (const axis of axes ?? []) {
		if (!layout.appearance.has(axis)) {
			throw new Error(
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
	const elementRegistry = createRegistry('Element', (lists.elements ?? []) as readonly AnyElementRegistration[]);
	const recipeRegistry = createFormRecipeRegistry((lists.recipes ?? []) as readonly AnyRecipeRegistration[]);
	const actionRegistry = createRegistry('Action', (lists.actions ?? []) as readonly AnyActionRegistration[]);

	for (const element of elementRegistry.all()) {
		assertDeclaredAxes(`Element '${element.$type}'`, element.appearanceAxes, layout);
	}
	for (const recipe of recipeRegistry.all()) {
		for (const [slot, axes] of Object.entries(recipe.appearanceAxes ?? {})) {
			assertDeclaredAxes(`Recipe '${recipe.$type}' slot '${slot}'`, axes, layout);
		}
	}

	const validations = Object.freeze([...(lists.validations ?? [])]);
	const validationRegistry = createDefaultValidationRegistry([
		...collectElementValidations(elementRegistry.all() as readonly ElementRegistrationConstraint[]),
		...validations,
	]);

	assertDefaultWizardRecipe(recipeRegistry, lists.defaultWizardRecipe);

	logger.debug('Building FormEngine', {
		elements: elementRegistry.size,
		recipes: recipeRegistry.size,
		actions: actionRegistry.size,
	});

	const childSchema = z.lazy(() => elementsUnion);
	const exportedElements = toExportRegistrations(elementRegistry.all(), ComponentType.Element, layout, childSchema);
	const exportedRecipes = toExportRegistrations(recipeRegistry.all(), ComponentType.Recipe, layout);
	const exportedActions = toExportRegistrations(actionRegistry.all(), ComponentType.Action, layout);

	const exportSchemas = new Map<string, z.ZodMiniType>();
	for (const [componentType, exported] of [
		[ComponentType.Element, exportedElements],
		[ComponentType.Recipe, exportedRecipes],
	] as const) {
		for (const item of exported) {
			if (item.exportSchema !== item.schema && isZodType(item.exportSchema)) {
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

	const elementsUnion = createElementsUnion(exportedElements, layout);
	const formConfigSchema = createFormConfigSchema(elementsUnion, exportedRecipes, exportedActions, layout);
	const actionConfigValidators = createActionConfigValidatorMap(actionRegistry.all());
	const schemaArtifacts = createFormEngineSchemaArtifacts(
		metadataCatalog,
		formConfigSchema,
		actionConfigValidators,
		exportSchemas,
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
