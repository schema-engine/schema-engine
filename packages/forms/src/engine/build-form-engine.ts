import { createRegistry } from '@schema-engine/registry';
import type { ActionRegistrationRegistry, ElementRegistry, RecipeRegistry } from '@/registries';
import type { AnyElementRegistration, AnyRecipeRegistration, AnyActionRegistration } from '@/types/registration';
import type {
	ActionRegistrationConstraint,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
} from '@/builder/types.utils';
import { FormEngine } from '@/engine/form-engine';
import { ComponentType } from '@/engine/component-type';
import { createActionConfigValidatorMap, createFormEngineSchemaArtifacts } from '@/engine/schema-artifacts';
import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog';
import { logger } from '@/lib/logger';
import {
	assertAxesNotReserved,
	createLayoutTheme,
	getDefaultLayoutTheme,
	isLayoutTheme,
	type LayoutInput,
	type LayoutTheme,
} from '@schema-engine/layout';
import { RENDERER_DATA_ATTRIBUTES } from '@/lib/renderer-data-attributes';
import { createFormConfigShape } from '@/schemas/form-config-shape';
import * as z from 'zod/mini';
import { isZodType } from '@/lib/zod-json-schema';
import { assertRecipeKindSlots } from '@/recipes/assert-recipe-kind';
import { assertStandardSchema } from '@/lib/standard-schema';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import { createDefaultValidationRegistry, type ValidationRegistry } from '@/schemas/validation';

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
 * JSON Schema / authoring union. Zod registrations keep their full schema.
 * Native Standard Schema registrations contribute a literal `$type` envelope
 * so mixed engines do not silently drop supported types.
 */
function createRegistrationSchema(registrations: Array<{ $type: string; schema: unknown }>): z.ZodMiniType {
	const parts = registrations.map((registration) =>
		isZodType(registration.schema) ? registration.schema : z.looseObject({ $type: z.literal(registration.$type) }),
	);
	return createUnionSchema(parts);
}

function createFormConfigSchema(
	elementRegistry: ElementRegistry,
	recipeRegistry: RecipeRegistry,
	actionRegistry: ActionRegistrationRegistry,
) {
	const elementsUnion = createRegistrationSchema([...elementRegistry.all()]);
	const recipesUnion = createRegistrationSchema([...recipeRegistry.all()]);
	const actionsUnion = createRegistrationSchema([...actionRegistry.all()]);

	return createFormConfigShape({
		elements: elementsUnion,
		view: recipeRegistry.size > 0 ? recipesUnion : z.never(),
		actions: actionsUnion,
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
	registration: {
		$type: string;
		schema: unknown;
		metadata: { name: string; description?: string; category?: string };
	},
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
 * Rejects an axis a registration declares that the engine's vocabulary does not, so a typo such as
 * `'sise'` fails the build instead of silently making the axis unsupported.
 */
function assertDeclaredAxes(owner: string, axes: readonly string[] | undefined, layout: LayoutTheme): void {
	for (const axis of axes ?? []) {
		if (!(axis in layout.axes)) {
			throw new Error(
				`${owner} declares unknown appearance axis '${axis}'. Declared axes: ${Object.keys(layout.axes).join(', ')}. Add it with createFormEngine({ layout: { appearance: { ${axis}: [...] } } }).`,
			);
		}
	}
}

export type FormEngineRegistrationLists = {
	elements?: readonly ElementRegistrationConstraint[];
	recipes?: readonly RecipeRegistrationConstraint[];
	actions?: readonly ActionRegistrationConstraint[];
	catalog?: SchemaMetadataCatalog;
	defaultWizardRecipe?: string;
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
 */
function resolveLayout(layout: LayoutInput | undefined): LayoutTheme {
	if (layout === undefined) return getDefaultLayoutTheme();
	if (isLayoutTheme(layout)) {
		assertAxesNotReserved(layout, RENDERER_DATA_ATTRIBUTES);
		return layout;
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
	const recipeRegistry = createRegistry('Recipe', (lists.recipes ?? []) as readonly AnyRecipeRegistration[]);
	const actionRegistry = createRegistry('Action', (lists.actions ?? []) as readonly AnyActionRegistration[]);

	for (const element of elementRegistry.all()) {
		assertDeclaredAxes(`Element '${element.$type}'`, element.appearanceAxes, layout);
	}
	for (const recipe of recipeRegistry.all()) {
		assertRecipeKindSlots(recipe);
		for (const [slot, axes] of Object.entries(recipe.appearanceAxes ?? {})) {
			assertDeclaredAxes(`Recipe '${recipe.$type}' slot '${slot}'`, axes, layout);
		}
	}

	const validationRegistryInstance = createDefaultValidationRegistry();
	registerLastWinsElementValidations(lists.elements ?? [], validationRegistryInstance);

	const defaultWizardRecipe = lists.defaultWizardRecipe;
	const checkedDefault = defaultWizardRecipe ?? DEFAULT_WIZARD_RECIPE;
	if (defaultWizardRecipe !== undefined || recipeRegistry.has(checkedDefault)) {
		const recipe = recipeRegistry.get(checkedDefault);
		if (!recipe) {
			throw new Error(
				`defaultWizardRecipe '${defaultWizardRecipe}' is not a registered recipe. Register it with createFormEngine({ recipes: [...] }).`,
			);
		}
		if (recipe.kind !== 'wizard') {
			throw new Error(
				`defaultWizardRecipe '${checkedDefault}' has kind '${recipe.kind}'; it must be a wizard recipe.`,
			);
		}
	}

	logger.debug('Building FormEngine', {
		elements: elementRegistry.size,
		recipes: recipeRegistry.size,
		actions: actionRegistry.size,
	});

	const metadataCatalog = lists.catalog?.clone() ?? new SchemaMetadataCatalog();
	for (const [componentType, registrations] of [
		[ComponentType.Element, elementRegistry],
		[ComponentType.Recipe, recipeRegistry],
		[ComponentType.Action, actionRegistry],
	] as const) {
		for (const item of registrations.all()) {
			registerSchemaMetadata(metadataCatalog, componentType, item);
		}
	}

	const formConfigSchema = createFormConfigSchema(elementRegistry, recipeRegistry, actionRegistry);
	const actionConfigValidators = createActionConfigValidatorMap(actionRegistry.all());
	const schemaArtifacts = createFormEngineSchemaArtifacts(metadataCatalog, formConfigSchema, actionConfigValidators);

	return new FormEngine({
		elements: elementRegistry,
		recipes: recipeRegistry,
		actions: actionRegistry,
		schemaArtifacts,
		layout,
		validationRegistry: validationRegistryInstance,
		defaultWizardRecipe,
	});
}

/**
 * Registers `validations` from the last-wins element for each `$type`.
 */
function registerLastWinsElementValidations(
	elements: readonly ElementRegistrationConstraint[],
	registry: ValidationRegistry,
): void {
	const seen = new Set<string>();
	for (let index = elements.length - 1; index >= 0; index -= 1) {
		const element = elements[index];
		if (seen.has(element.$type)) {
			continue;
		}
		seen.add(element.$type);
		if (element.validations?.length) {
			registry.registerMultiple([...element.validations]);
		}
	}
}
