import type {
	InputRegistration,
	StaticRegistration,
	RecipeRegistration,
	BuilderActionRegistration,
	BuilderActionBaseContext,
	ElementMetadata,
} from '@/types';
import { FormEngine } from '@/engine/form-engine';
import { ComponentType } from '@/engine/component-type';
import { createActionConfigValidatorMap, createFormEngineSchemaArtifacts } from '@/engine/schema-artifacts';
import { SchemaMetadataCatalog } from '@/engine/schema-metadata-catalog';
import { logger } from '@/lib/logger';
import { ElementRegistry, RecipeRegistry } from '@/registries';
import { createFormConfigShape } from '@/schemas/form-config-shape';
import { ActionRegistry, type ActionConfigBase } from '@schema-engine/actions';
import { z } from 'zod';
import { isZodType } from '@/lib/zod-json-schema';
import type { ExtractSchemaType } from './types.utils';
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

	addElement<const K extends string, S>(registration: {
		$type: K;
		schema: S;
		metadata: ElementMetadata;
		render: (...args: any[]) => unknown;
	}): FormComposer<TElements & Record<K, ExtractSchemaType<S>>, TRecipes, TActions> {
		this.elementRegistry.register(registration);
		return this as FormComposer<TElements & Record<K, ExtractSchemaType<S>>, TRecipes, TActions>;
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
	addRecipe<const K extends string, S>(registration: {
		$type: K;
		schema: S;
		kind: 'single-step' | 'wizard';
		slots: Array<'shell' | 'header' | 'progress' | 'actions'>;
		metadata: { name: string; description?: string };
		render: unknown;
		slotDefaults?: RecipeRegistration<any, any>['slotDefaults'];
	}): FormComposer<TElements, TRecipes & Record<K, ExtractSchemaType<S>>, TActions> {
		this.recipeRegistry.register(registration);
		return this as FormComposer<TElements, TRecipes & Record<K, ExtractSchemaType<S>>, TActions>;
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
		return this as FormComposer<TElements, TRecipes, TActions & Record<TType, TConfig>>;
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

	/**
	 * JSON Schema / authoring union. Zod registrations keep their full schema.
	 * Native Standard Schema registrations contribute a literal `$type` envelope
	 * so mixed engines do not silently drop supported types.
	 */
	private createRegistrationSchema(registrations: Array<{ $type: string; schema: unknown }>): z.ZodTypeAny {
		const parts = registrations.map((registration) =>
			isZodType(registration.schema)
				? registration.schema
				: z.looseObject({ $type: z.literal(registration.$type) }),
		);
		return this.createUnionSchema(parts);
	}

	createFormConfigSchema() {
		const elementsUnion = this.createRegistrationSchema(this.elementRegistry.getAll());
		const recipesUnion = this.createRegistrationSchema(this.recipeRegistry.getAll());
		const actionsUnion = this.createRegistrationSchema(this.actionRegistry.getAll());

		return createFormConfigShape({
			elements: elementsUnion,
			view: this.recipeRegistry.size > 0 ? recipesUnion : z.never(),
			actions: actionsUnion,
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
