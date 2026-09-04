import type {
	InputRegistration,
	StaticRegistration,
	RecipeRegistration,
	BuilderActionRegistration,
	BuilderActionBaseContext,
} from '@/types';
import { FormEngine } from '@/engine/form-engine';
import { ComponentType } from '@/engine/component-type';
import { createActionConfigValidatorMap, createFormEngineSchemaArtifacts } from '@/engine/schema-artifacts';
import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog';
import { logger } from '@/lib/logger';
import { ElementRegistry, RecipeRegistry } from '@/registries';
import { GridLayoutConfigSchema } from '@/schemas/base-field';
import { ActionRegistry, type ActionConfigBase } from '@schema-engine/actions';
import { z } from 'zod';
import type { ExtractSchemaType, ExtractTypeId } from './types.utils';
import type { FormActionTrigger } from '@/actions';

/**
 * FormComposer - Composes the capabilities of the Form Engine.
 */
export class FormComposer<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TRecipes extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	constructor(
		private elementRegistry = new ElementRegistry(),
		private recipeRegistry = new RecipeRegistry(),
		private actionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>(),
	) {}

	addElement<T extends InputRegistration<any, any, any> | StaticRegistration<any, any, any>>(
		registration: T,
	): FormComposer<TElements & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>, TRecipes, TActions> {
		this.elementRegistry.register(registration);
		return this;
	}

	addElements(registrations: (InputRegistration<any, any, any> | StaticRegistration<any, any, any>)[]): this {
		for (const registration of registrations) {
			this.addElement(registration);
		}
		return this;
	}

	/**
	 * Register one view recipe. `$type` is the id used in `view.$type`.
	 * A second registration with the same `$type` overrides the first.
	 */
	addRecipe<T extends RecipeRegistration<any, any>>(
		registration: T,
	): FormComposer<TElements, TRecipes & Record<ExtractTypeId<T>, ExtractSchemaType<T['schema']>>, TActions> {
		this.recipeRegistry.register(registration);
		return this;
	}

	/** Register several recipes. Same `$type` override rules as {@link addRecipe}. */
	addRecipes(registrations: RecipeRegistration<any, any>[]): this {
		for (const registration of registrations) {
			this.addRecipe(registration);
		}
		return this;
	}

	addAction<TType extends string, TConfig extends ActionConfigBase<TType>>(
		registration: BuilderActionRegistration<TType, TConfig>,
	): FormComposer<TElements, TRecipes, TActions & Record<TType, TConfig>> {
		this.actionRegistry.register(registration);
		return this;
	}

	addActions(registrations: BuilderActionRegistration<any, any>[]): this {
		for (const registration of registrations) {
			this.addAction(registration);
		}
		return this;
	}

	private createUnionSchema(schemas: z.ZodTypeAny[]): z.ZodTypeAny {
		if (schemas.length === 0) {
			return z.never();
		}
		if (schemas.length === 1) {
			return schemas[0];
		}
		return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
	}

	createFormConfigSchema() {
		const elementSchemas = this.elementRegistry.getAll().map((el) => el.schema);
		const recipeSchemas = this.recipeRegistry.getAll().map((recipe) => recipe.schema);
		const actionSchemas = this.actionRegistry.getAll().map((action: any) => action.schema);

		const elementsUnion = this.createUnionSchema(elementSchemas as z.ZodTypeAny[]);
		const recipesUnion = this.createUnionSchema(recipeSchemas as z.ZodTypeAny[]);
		const actionsUnion = this.createUnionSchema(actionSchemas as z.ZodTypeAny[]);

		const formStepSchema = z.object({
			id: z.string(),
			title: z.string(),
			description: z.string().optional(),
			icon: z.string().optional(),
			elements: z.array(elementsUnion),
			rules: z.any().optional(),
			constraints: z.array(z.any()).optional(),
			className: z.string().optional(),
			style: z.record(z.string(), z.any()).optional(),
			onStepEnter: z.array(actionsUnion).optional(),
			onStepLeave: z.array(actionsUnion).optional(),
			onStepValidate: z.array(actionsUnion).optional(),
			actions: z.array(actionsUnion).optional(),
		});

		return z.object({
			id: z.string().describe('Unique identifier for the form'),
			title: z.string().optional().describe('Display title of the form'),
			description: z.string().optional().describe('Description of the form purpose'),
			steps: z.array(formStepSchema),
			view: z.optional(recipeSchemas.length > 0 ? recipesUnion : z.never()),
			grid: z.lazy(() => GridLayoutConfigSchema).optional(),
			validationMode: z.enum(['onSubmit', 'onChange', 'onBlur', 'all']).optional(),
			reValidateMode: z.enum(['onSubmit', 'onChange', 'onBlur']).optional(),
			className: z.string().optional(),
			style: z.record(z.string(), z.any()).optional(),
			actions: z.array(actionsUnion).optional(),
		});
	}

	clone(): FormComposer<TElements, TRecipes, TActions> {
		const newElementRegistry = new ElementRegistry();
		const newRecipeRegistry = new RecipeRegistry();
		const newActionRegistry = new ActionRegistry<BuilderActionBaseContext, FormActionTrigger>();

		for (const item of this.elementRegistry.getAll()) {
			newElementRegistry.register(item);
		}
		for (const item of this.recipeRegistry.getAll()) {
			newRecipeRegistry.register(item);
		}
		for (const item of this.actionRegistry.getAll()) {
			newActionRegistry.register(item);
		}
		const newBuilder = new FormComposer<TElements, TRecipes, TActions>(
			newElementRegistry,
			newRecipeRegistry,
			newActionRegistry,
		);

		logger.debug('Cloned FormComposer', {
			elements: newBuilder.elementRegistry.size,
			recipes: newBuilder.recipeRegistry.size,
			actions: newBuilder.actionRegistry.size,
		});

		return newBuilder;
	}

	build(catalog?: SchemaMetadataCatalog): FormEngine<TElements, TRecipes, TActions> {
		logger.debug('Building FormEngine', {
			elements: this.elementRegistry.size,
			recipes: this.recipeRegistry.size,
			actions: this.actionRegistry.size,
		});

		const metadataCatalog = catalog ?? new SchemaMetadataCatalog();

		if (!catalog) {
			metadataCatalog.registerFromRegistry(this.elementRegistry, (item) => ({
				id: `element:${item.$type}`,
				componentType: ComponentType.Element,
				title: item.metadata.name,
				description: item.metadata.description,
				category: item.metadata.category,
			}));

			metadataCatalog.registerFromRegistry(this.recipeRegistry, (item) => ({
				id: `recipe:${item.$type}`,
				componentType: ComponentType.Recipe,
				title: item.metadata.name,
				description: item.metadata.description,
				category: item.metadata.category,
			}));

			metadataCatalog.registerFromRegistry(this.actionRegistry, (item) => ({
				id: `action:${item.$type}`,
				componentType: ComponentType.Action,
				title: item.metadata.name,
				description: item.metadata.description,
			}));
		}

		const formConfigSchema = this.createFormConfigSchema();
		const actionConfigValidators = createActionConfigValidatorMap(this.actionRegistry.getAll());
		const schemaArtifacts = createFormEngineSchemaArtifacts(
			metadataCatalog,
			formConfigSchema,
			undefined,
			actionConfigValidators,
		);

		return new FormEngine({
			elements: this.elementRegistry.getMap(),
			recipes: this.recipeRegistry.getMap(),
			actions: this.actionRegistry.getMap(),
			schemaArtifacts,
			formConfigSchema,
		});
	}
}
