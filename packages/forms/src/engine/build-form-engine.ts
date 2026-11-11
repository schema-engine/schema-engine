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
import { compileGridTheme, getDefaultCompiledGrid, type CompiledGrid, type GridThemeOptions } from '@/lib/grid-styles';
import { createFormConfigShape } from '@/schemas/form-config-shape';
import * as z from 'zod/mini';
import { isZodType } from '@/lib/zod-json-schema';
import { assertRecipeKindSlots } from '@/recipes/assert-recipe-kind';
import { assertStandardSchema } from '@/lib/standard-schema';
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
	elementRegistry: Map<string, AnyElementRegistration>,
	recipeRegistry: Map<string, AnyRecipeRegistration>,
	actionRegistry: Map<string, AnyActionRegistration>,
) {
	const elementsUnion = createRegistrationSchema([...elementRegistry.values()]);
	const recipesUnion = createRegistrationSchema([...recipeRegistry.values()]);
	const actionsUnion = createRegistrationSchema([...actionRegistry.values()]);

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

export type FormEngineRegistrationLists = {
	elements?: readonly ElementRegistrationConstraint[];
	recipes?: readonly RecipeRegistrationConstraint[];
	actions?: readonly ActionRegistrationConstraint[];
	catalog?: SchemaMetadataCatalog;
	defaultWizardRecipe?: string;
} & ({ grid?: GridThemeOptions; compiledGrid?: never } | { grid?: never; compiledGrid: CompiledGrid });

/**
 * Single construction path for {@link createFormEngine} and {@link FormEngine.extend}.
 * Later duplicate `$type` values overwrite earlier ones (last-wins).
 */
export function buildFormEngine(lists: FormEngineRegistrationLists) {
	const elementRegistry = new Map<string, AnyElementRegistration>();
	const recipeRegistry = new Map<string, AnyRecipeRegistration>();
	const actionRegistry = new Map<string, AnyActionRegistration>();

	for (const element of lists.elements ?? []) {
		assertStandardSchema(element.schema, `Element '${element.$type}' schema`);
		elementRegistry.set(element.$type, element as AnyElementRegistration);
	}

	const validationRegistryInstance = createDefaultValidationRegistry();
	registerLastWinsElementValidations(lists.elements ?? [], validationRegistryInstance);

	for (const recipe of lists.recipes ?? []) {
		assertStandardSchema(recipe.schema, `Recipe '${recipe.$type}' schema`);
		assertRecipeKindSlots(recipe);
		recipeRegistry.set(recipe.$type, recipe as AnyRecipeRegistration);
	}
	for (const action of lists.actions ?? []) {
		assertStandardSchema(action.schema, `Action '${action.$type}' schema`);
		actionRegistry.set(action.$type, action as AnyActionRegistration);
	}

	const defaultWizardRecipe = lists.defaultWizardRecipe;
	if (defaultWizardRecipe !== undefined) {
		const recipe = recipeRegistry.get(defaultWizardRecipe);
		if (!recipe) {
			throw new Error(
				`defaultWizardRecipe '${defaultWizardRecipe}' is not a registered recipe. Register it with createFormEngine({ recipes: [...] }).`,
			);
		}
		if (recipe.kind !== 'wizard') {
			throw new Error(
				`defaultWizardRecipe '${defaultWizardRecipe}' has kind '${recipe.kind}'; it must be a wizard recipe.`,
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
		for (const item of registrations.values()) {
			registerSchemaMetadata(metadataCatalog, componentType, item);
		}
	}

	const formConfigSchema = createFormConfigSchema(elementRegistry, recipeRegistry, actionRegistry);
	const actionConfigValidators = createActionConfigValidatorMap([...actionRegistry.values()]);
	const schemaArtifacts = createFormEngineSchemaArtifacts(metadataCatalog, formConfigSchema, actionConfigValidators);

	const compiledGrid =
		lists.compiledGrid ?? (lists.grid === undefined ? getDefaultCompiledGrid() : compileGridTheme(lists.grid));

	return new FormEngine({
		elements: elementRegistry,
		recipes: recipeRegistry,
		actions: actionRegistry,
		schemaArtifacts,
		compiledGrid,
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
