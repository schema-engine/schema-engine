import type { BuilderActionBaseContext } from '@/types';
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
import { ElementRegistry, RecipeRegistry } from '@/registries';
import { createFormConfigShape } from '@/schemas/form-config-shape';
import { ActionRegistry } from '@schema-engine/actions';
import * as z from 'zod/mini';
import { isZodType } from '@/lib/zod-json-schema';
import { assertStandardSchema } from '@/lib/standard-schema';
import type { FormActionTrigger } from '@/actions';
import { validationRegistry } from '@/schemas/validation';

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
	actionRegistry: ActionRegistry<BuilderActionBaseContext, FormActionTrigger>,
) {
	const elementsUnion = createRegistrationSchema(elementRegistry.getAll());
	const recipesUnion = createRegistrationSchema(recipeRegistry.getAll());
	const actionsUnion = createRegistrationSchema(actionRegistry.getAll());

	return createFormConfigShape({
		elements: elementsUnion,
		view: recipeRegistry.size > 0 ? recipesUnion : z.never(),
		actions: actionsUnion,
	});
}

export interface FormEngineRegistrationLists {
	elements?: readonly ElementRegistrationConstraint[];
	recipes?: readonly RecipeRegistrationConstraint[];
	actions?: readonly ActionRegistrationConstraint[];
	catalog?: SchemaMetadataCatalog;
}

/**
 * Single construction path for {@link createFormEngine} and {@link FormEngine.extend}.
 * Later duplicate `$type` values overwrite earlier ones (last-wins).
 */
export function buildFormEngine(lists: FormEngineRegistrationLists) {
	const elementRegistry = new ElementRegistry();
	const recipeRegistry = new RecipeRegistry();
	const actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

	for (const element of lists.elements ?? []) {
		assertStandardSchema(element.schema, `Element '${element.$type}' schema`);
		elementRegistry.register(element as unknown as Parameters<ElementRegistry['register']>[0]);
	}

	registerLastWinsElementValidations(lists.elements ?? []);

	for (const recipe of lists.recipes ?? []) {
		assertStandardSchema(recipe.schema, `Recipe '${recipe.$type}' schema`);
		recipeRegistry.register(recipe as unknown as Parameters<RecipeRegistry['register']>[0]);
	}
	for (const action of lists.actions ?? []) {
		assertStandardSchema(action.schema, `Action '${action.$type}' schema`);
		actionRegistry.register(
			action as unknown as Parameters<ActionRegistry<BuilderActionBaseContext, FormActionTrigger>['register']>[0],
		);
	}

	logger.debug('Building FormEngine', {
		elements: elementRegistry.size,
		recipes: recipeRegistry.size,
		actions: actionRegistry.size,
	});

	const metadataCatalog = lists.catalog ?? new SchemaMetadataCatalog();

	if (!lists.catalog) {
		metadataCatalog.registerFromRegistry(elementRegistry, (item) => ({
			id: `element:${item.$type}`,
			componentType: ComponentType.Element,
			title: item.metadata.name,
			description: item.metadata.description,
			category: item.metadata.category,
		}));

		metadataCatalog.registerFromRegistry(recipeRegistry, (item) => ({
			id: `recipe:${item.$type}`,
			componentType: ComponentType.Recipe,
			title: item.metadata.name,
			description: item.metadata.description,
			category: item.metadata.category,
		}));

		metadataCatalog.registerFromRegistry(actionRegistry, (item) => ({
			id: `action:${item.$type}`,
			componentType: ComponentType.Action,
			title: item.metadata.name,
			description: item.metadata.description,
		}));
	}

	const formConfigSchema = createFormConfigSchema(elementRegistry, recipeRegistry, actionRegistry);
	const actionConfigValidators = createActionConfigValidatorMap(actionRegistry.getAll());
	const schemaArtifacts = createFormEngineSchemaArtifacts(
		metadataCatalog,
		formConfigSchema,
		undefined,
		actionConfigValidators,
	);

	return new FormEngine({
		elements: elementRegistry.getMap(),
		recipes: recipeRegistry.getMap(),
		actions: actionRegistry.getMap(),
		schemaArtifacts,
		formConfigSchema,
	});
}

/**
 * Registers `validations` from the last-wins element for each `$type`.
 */
function registerLastWinsElementValidations(elements: readonly ElementRegistrationConstraint[]): void {
	const seen = new Set<string>();
	for (let index = elements.length - 1; index >= 0; index -= 1) {
		const element = elements[index];
		if (seen.has(element.$type)) {
			continue;
		}
		seen.add(element.$type);
		if (element.validations?.length) {
			validationRegistry.registerMultiple([...element.validations]);
		}
	}
}
