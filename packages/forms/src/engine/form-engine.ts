import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import { ComponentType } from './component-type';
import { logger } from '@/lib/logger';
import type { StandardJSONSchemaV1 } from '@/lib/standard-json-schema';
import * as z from 'zod/mini';
import type { FormEngineSchemaArtifacts } from './schema-artifacts';
import { validateElementConfig, validateFormConfig } from '@/lib/validate-form';
import type { NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
import type { ExactFormAppearance, ExactViewConfig, FormAuthoringInput } from '@/builder/form-authoring';
import type {
	LastWinsMerge,
	EngineOutputMaps,
	MergedOutputMap,
	MergedRegistrationMap,
	MergedActionRegistrationMap,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
	ActionRegistrationConstraint,
} from '@/builder/types.utils';
import type { ExtendFormEngineOptions } from './create-form-engine';
import { buildFormEngine } from './build-form-engine';
import { SchemaMetadataCatalog } from './schema-metadata-catalog';
import type { CompiledGrid, NormalizedGridTheme } from '@schema-engine/layout';
import type { CompiledAppearance, ResolvedAppearanceAxes } from '@/lib/appearance';
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
	elements: Map<string, AnyElementRegistration>;
	recipes: Map<string, AnyRecipeRegistration>;
	actions: Map<string, AnyActionRegistration>;
	schemaArtifacts: FormEngineSchemaArtifacts;
	compiledGrid: CompiledGrid;
	compiledAppearance: CompiledAppearance;
	validationRegistry: ValidationRegistry;
	defaultWizardRecipe?: string;
}

export class FormEngine<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
	TAppearance extends Record<string, string> = ResolvedAppearanceAxes,
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
			compiledAppearance: registries.compiledAppearance,
			validationRegistry: registries.validationRegistry,
			defaultWizardRecipe: registries.defaultWizardRecipe,
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

	getElement(id: string): AnyElementRegistration | undefined {
		return this.registries.elements.get(id);
	}

	getAllElements(): AnyElementRegistration[] {
		return Array.from(this.registries.elements.values());
	}

	getElementIds(): string[] {
		return Array.from(this.registries.elements.keys());
	}

	hasElement(id: string): boolean {
		return this.registries.elements.has(id);
	}

	getRecipe(id: string): AnyRecipeRegistration | undefined {
		return this.registries.recipes.get(id);
	}

	getAllRecipes(): AnyRecipeRegistration[] {
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

	/**
	 * The engine's immutable appearance vocabulary: axes, their values, and the token stylesheet.
	 *
	 * @remarks
	 * Renderers emit `css` once per form next to the grid theme and put `id` on the form element as
	 * `data-se-appearance-theme`, which scopes the token rules to this engine's forms.
	 */
	getAppearance(): CompiledAppearance {
		return this.registries.compiledAppearance;
	}

	getValidationRegistry(): ValidationRegistry {
		return this.validationRegistry;
	}

	/** The engine's immutable grid theme (computed once at construction). */
	getGridTheme(): NormalizedGridTheme {
		return this.compiledGrid.theme;
	}

	getAction(id: string): AnyActionRegistration | undefined {
		return this.registries.actions.get(id);
	}

	getAllActions(): AnyActionRegistration[] {
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
	validateForm(
		config: unknown,
	): NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']> {
		return validateFormConfig(config, {
			owner: this,
			getRecipe: (id) => this.getRecipe(id),
			defaultWizardRecipe: this.registries.defaultWizardRecipe,
			getElement: (id) => this.getElement(id),
			getAction: (id) => this.getAction(id),
			hasValidation: (type) => this.validationRegistry.has(type),
			appearance: this.registries.compiledAppearance,
		}) as unknown as NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>;
	}

	/**
	 * Author a form from this engine's registered elements, recipes, and actions.
	 * Same runtime pipeline as {@link validateForm}.
	 */
	defineForm<const TConfig extends FormAuthoringInput<TElements, TRecipes, TActions, TAppearance>>(
		config: TConfig & { view?: ExactViewConfig<TConfig['view'], TRecipes, TAppearance> } & ExactFormAppearance<
				TConfig,
				TAppearance
			>,
	): NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']> {
		return this.validateForm(config);
	}

	/**
	 * Validate a single element against this engine's registrations, including nested children.
	 * Use for standalone or dynamically created fields that are not already inside a normalized form.
	 * The normalized marker is applied only after this element and its children succeed.
	 */
	validateElement(config: unknown): NormalizedElementConfig<TOutputs['elements']> {
		return validateElementConfig(config, {
			getElement: (id) => this.getElement(id),
			hasValidation: (type) => this.validationRegistry.has(type),
			appearance: this.registries.compiledAppearance,
		}) as unknown as NormalizedElementConfig<TOutputs['elements']>;
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

	/**
	 * @remarks
	 * Generated as input: authors may omit prefaulted slots and defaulted keys, so only `$type` is required.
	 */
	private generateRecipeViewSchema(recipe: AnyRecipeRegistration): Record<string, unknown> {
		try {
			return generateZodJSONSchemaDocument(
				recipe.schema as z.ZodMiniType,
				this.schemaArtifacts.metadataRegistry,
				{
					target: 'draft-2020-12',
					io: 'input',
					schemaId: SchemaMetadataCatalog.entryId(ComponentType.Recipe, recipe.$type),
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
		LastWinsMerge<TActions, MergedActionRegistrationMap<TNewActions>>,
		{
			elements: LastWinsMerge<TOutputs['elements'], MergedOutputMap<TNewElements>>;
			recipes: LastWinsMerge<TOutputs['recipes'], MergedOutputMap<TNewRecipes>>;
			actions: LastWinsMerge<TOutputs['actions'], MergedOutputMap<TNewActions>>;
		},
		TAppearance
	> {
		return buildFormEngine({
			elements: [...this.getAllElements(), ...(options?.elements ?? [])],
			recipes: [...this.getAllRecipes(), ...(options?.recipes ?? [])],
			actions: [...this.getAllActions(), ...(options?.actions ?? [])],
			catalog: options?.catalog ?? this.schemaArtifacts.metadataCatalog,
			compiledGrid: this.compiledGrid,
			compiledAppearance: this.registries.compiledAppearance,
			defaultWizardRecipe: this.registries.defaultWizardRecipe,
		}) as unknown as FormEngine<
			LastWinsMerge<TElements, MergedRegistrationMap<TNewElements>>,
			LastWinsMerge<TRecipes, MergedRegistrationMap<TNewRecipes>>,
			LastWinsMerge<TActions, MergedActionRegistrationMap<TNewActions>>,
			{
				elements: LastWinsMerge<TOutputs['elements'], MergedOutputMap<TNewElements>>;
				recipes: LastWinsMerge<TOutputs['recipes'], MergedOutputMap<TNewRecipes>>;
				actions: LastWinsMerge<TOutputs['actions'], MergedOutputMap<TNewActions>>;
			},
			TAppearance
		>;
	}
}

/**
 * Engine operations available while rendering a form.
 *
 * @remarks
 * Registration extension belongs to engine construction. Omitting it allows a
 * renderer to hold engines with different parsed output maps without widening
 * their authoring or normalized return types on the constructed engine.
 */
export type FormEngineRuntime<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
	TAppearance extends Record<string, string> = ResolvedAppearanceAxes,
> = Omit<FormEngine<TElements, TRecipes, TActions, TOutputs, TAppearance>, 'extend'>;

export type { EngineOutputMaps } from '@/builder/types.utils';
