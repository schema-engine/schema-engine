import type { BuilderActionRegistration, InputRegistration, RecipeRegistration, StaticRegistration } from '@/types';
import { logger } from '@/lib/logger';
import type { StandardJSONSchemaV1 } from '@/lib/standard-json-schema';
import * as z from 'zod/mini';
import type { FormEngineSchemaArtifacts } from './schema-artifacts';
import { validateElementConfig, validateFormConfig } from '@/lib/validate-form';
import type { NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
import type { FormAuthoringInput } from '@/builder/form-authoring';
import type {
	LastWinsMerge,
	MergedRegistrationMap,
	MergedActionRegistrationMap,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
	ActionRegistrationConstraint,
} from '@/builder/types.utils';
import type { ExtendFormEngineOptions } from './create-form-engine';
import { buildFormEngine } from './build-form-engine';
import type { CompiledGrid, NormalizedGridTheme } from '@/lib/grid-styles';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry';
import {
	describeRecipeFromRegistration,
	describeViewCatalogFromRecipes,
	getAuthoringInstructionsFromCatalog,
} from '@/lib/authoring-catalog';
import type { RecipeDescriptor, ViewCatalog } from '@/recipes/types';
import { generateZodJSONSchemaDocument } from '@/lib/zod-json-schema';
export * from './component-type';

/**
 * Engine registries - internal storage for all registered components.
 */
export interface EngineRegistries {
	elements: Map<string, InputRegistration<any, any, any> | StaticRegistration<any, any, any>>;
	recipes: Map<string, RecipeRegistration<any, any>>;
	actions: Map<string, BuilderActionRegistration>;
	schemaArtifacts: FormEngineSchemaArtifacts;
	compiledGrid: CompiledGrid;
	validationRegistry: ValidationRegistry;
}

export class FormEngine<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TRecipes extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	private readonly registries: EngineRegistries;
	private readonly schemaArtifacts: FormEngineSchemaArtifacts;
	private readonly compiledGrid: CompiledGrid;
	private readonly validationRegistry: ValidationRegistry;

	constructor(registries: EngineRegistries) {
		this.registries = {
			elements: new Map(registries.elements),
			recipes: new Map(registries.recipes),
			actions: new Map(registries.actions),
			schemaArtifacts: registries.schemaArtifacts,
			compiledGrid: registries.compiledGrid,
			validationRegistry: registries.validationRegistry,
		};
		this.schemaArtifacts = registries.schemaArtifacts;
		this.compiledGrid = registries.compiledGrid;
		this.validationRegistry = registries.validationRegistry;

		logger.debug('FormEngine initialized', {
			elements: this.registries.elements.size,
			recipes: this.registries.recipes.size,
			actions: this.registries.actions.size,
		});
	}

	getElement(id: string): InputRegistration<any, any, any> | StaticRegistration<any, any, any> | undefined {
		return this.registries.elements.get(id);
	}

	getAllElements(): (InputRegistration<any, any, any> | StaticRegistration<any, any, any>)[] {
		return Array.from(this.registries.elements.values());
	}

	getElementIds(): string[] {
		return Array.from(this.registries.elements.keys());
	}

	hasElement(id: string): boolean {
		return this.registries.elements.has(id);
	}

	getRecipe(id: string): RecipeRegistration<any, any> | undefined {
		return this.registries.recipes.get(id);
	}

	getAllRecipes(): RecipeRegistration<any, any>[] {
		return Array.from(this.registries.recipes.values());
	}

	getRecipeIds(): string[] {
		return Array.from(this.registries.recipes.keys());
	}

	hasRecipe(id: string): boolean {
		return this.registries.recipes.has(id);
	}

	/**
	 * The engine's immutable compiled grid: the resolved theme and its stylesheet.
	 *
	 * @remarks
	 * Compiled once when the engine is built. Renderers emit `css` inside the
	 * rendered form markup (React hoists and dedupes by key; Radiant renders it
	 * inline), so SSR output is styled with no FOUC and no runtime injection.
	 */
	getCompiledGrid(): CompiledGrid {
		return this.compiledGrid;
	}

	getValidationRegistry(): ValidationRegistry {
		return this.validationRegistry;
	}

	/** The engine's immutable grid theme (computed once at construction). */
	getGridTheme(): NormalizedGridTheme {
		return this.compiledGrid.theme;
	}

	getAction(id: string): BuilderActionRegistration | undefined {
		return this.registries.actions.get(id);
	}

	getAllActions(): BuilderActionRegistration[] {
		return Array.from(this.registries.actions.values());
	}

	getActionTypes(): string[] {
		return Array.from(this.registries.actions.keys());
	}

	hasAction(id: string): boolean {
		return this.registries.actions.has(id);
	}

	getSummary() {
		return {
			elements: {
				count: this.registries.elements.size,
				ids: this.getElementIds(),
			},
			recipes: {
				count: this.registries.recipes.size,
				ids: this.getRecipeIds(),
			},
			actions: {
				count: this.registries.actions.size,
				types: this.getActionTypes(),
			},
		};
	}

	/**
	 * Validate external JSON against this engine's registrations.
	 * Applies defaults and schema transforms. Prefer {@link defineForm} when authoring in TypeScript.
	 * Returns a frozen {@link NormalizedFormConfig} owned by this engine.
	 */
	validateForm(config: unknown): NormalizedFormConfig {
		return validateFormConfig(config, {
			owner: this,
			getRecipe: (id) => this.getRecipe(id),
			getElement: (id) => this.getElement(id),
			getAction: (id) => this.getAction(id),
		});
	}

	/**
	 * Author a form from this engine's registered elements, recipes, and actions.
	 * Same runtime pipeline as {@link validateForm}.
	 */
	defineForm<const TConfig extends FormAuthoringInput<TElements, TRecipes, TActions>>(
		config: TConfig,
	): NormalizedFormConfig {
		return this.validateForm(config);
	}

	/**
	 * Validate a single element against this engine's registrations, including nested children.
	 * Use for standalone or dynamically created fields that are not already inside a normalized form.
	 * The normalized marker is applied only after this element and its children succeed.
	 */
	validateElement(config: unknown): NormalizedElementConfig {
		return validateElementConfig(config, { getElement: (id) => this.getElement(id) });
	}

	describeRecipe($type: string): RecipeDescriptor {
		const recipe = this.getRecipe($type);
		if (!recipe) {
			throw new Error(`Unknown recipe '${$type}'. Register it with createFormEngine({ recipes: [...] }).`);
		}
		return describeRecipeFromRegistration(recipe, (r) => this.generateRecipeViewSchema(r));
	}

	describeViewCatalog(): ViewCatalog {
		return describeViewCatalogFromRecipes(this.getAllRecipes(), (r) => this.generateRecipeViewSchema(r));
	}

	getAuthoringInstructions(): string {
		return getAuthoringInstructionsFromCatalog(this.describeViewCatalog());
	}

	private generateRecipeViewSchema(recipe: RecipeRegistration<any, any>): Record<string, unknown> {
		try {
			return generateZodJSONSchemaDocument(
				recipe.schema as z.ZodMiniType,
				this.schemaArtifacts.metadataRegistry,
				{
					target: 'draft-2020-12',
					schemaId: `recipe:${recipe.$type}`,
				},
			) as Record<string, unknown>;
		} catch (error) {
			logger.warn('Could not generate recipe view schema', {
				recipe: recipe.$type,
				error: error instanceof Error ? error.message : String(error),
			});
			return {};
		}
	}

	getSchemaArtifacts() {
		return this.schemaArtifacts;
	}

	getFormConfigStandardSchema(): StandardJSONSchemaV1 {
		return this.schemaArtifacts.jsonSchema.formConfigStandardSchema;
	}

	getActionConfigStandardSchema(actionType: string): StandardJSONSchemaV1 | undefined {
		return this.schemaArtifacts.jsonSchema.actionConfigStandardSchemas[actionType];
	}

	getSchemaCatalog() {
		return this.schemaArtifacts.metadataCatalog;
	}

	getSchemaRegistry() {
		return this.schemaArtifacts.metadataRegistry;
	}

	generateJSONSchemaCollection(options?: {
		target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		uri?: (id: string) => string;
		io?: 'input' | 'output';
	}) {
		return this.schemaArtifacts.jsonSchema.generateCollection(options);
	}

	getFormConfigSchema() {
		return this.schemaArtifacts.formConfigValidator;
	}

	generateFormConfigSchema(options?: {
		target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
		io?: 'input' | 'output';
	}) {
		return this.schemaArtifacts.jsonSchema.generateFormConfig(options);
	}

	generateActionConfigSchema(
		actionType: string,
		options?: {
			target?: 'draft-4' | 'draft-7' | 'draft-2020-12' | 'openapi-3.0';
			io?: 'input' | 'output';
		},
	) {
		return this.schemaArtifacts.jsonSchema.generateActionConfig(actionType, options);
	}

	/**
	 * Return a new engine with additional registrations merged in.
	 * Duplicate `$type` values follow last-wins semantics.
	 */
	extend<
		const TNewElements extends readonly ElementRegistrationConstraint[] = readonly [],
		const TNewRecipes extends readonly RecipeRegistrationConstraint[] = readonly [],
		const TNewActions extends readonly ActionRegistrationConstraint[] = readonly [],
	>(
		options?: ExtendFormEngineOptions<TNewElements, TNewRecipes, TNewActions>,
	): FormEngine<
		LastWinsMerge<TElements, MergedRegistrationMap<TNewElements>>,
		LastWinsMerge<TRecipes, MergedRegistrationMap<TNewRecipes>>,
		LastWinsMerge<TActions, MergedActionRegistrationMap<TNewActions>>
	> {
		return buildFormEngine({
			elements: [...this.getAllElements(), ...(options?.elements ?? [])],
			recipes: [...this.getAllRecipes(), ...(options?.recipes ?? [])],
			actions: [...this.getAllActions(), ...(options?.actions ?? [])],
			catalog: options?.catalog,
			compiledGrid: this.compiledGrid,
		}) as FormEngine<
			LastWinsMerge<TElements, MergedRegistrationMap<TNewElements>>,
			LastWinsMerge<TRecipes, MergedRegistrationMap<TNewRecipes>>,
			LastWinsMerge<TActions, MergedActionRegistrationMap<TNewActions>>
		>;
	}
}
