import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import type { ActionRegistrationRegistry, ElementRegistry, RecipeRegistry } from '@/registries';
import { ComponentType } from './component-type';
import { logger } from '@/lib/logger';
import type { StandardJSONSchemaV1 } from '@/lib/standard-json-schema';
import * as z from 'zod/mini';
import type { FormEngineSchemaArtifacts } from './schema-artifacts';
import {
	safeValidateFormConfig,
	validateElementConfig,
	validateFormConfig,
	type FormValidationResult,
} from '@/lib/validate-form';
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
import type { LayoutTheme, ResolvedAppearanceAxes } from '@schema-engine/layout';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types';
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
	elements: ElementRegistry;
	recipes: RecipeRegistry;
	actions: ActionRegistrationRegistry;
	schemaArtifacts: FormEngineSchemaArtifacts;
	layout: LayoutTheme;
	validationRegistry: ValidationRegistry;
	/** The validations passed to `createFormEngine`, kept so {@link FormEngine.extend} can rebuild the registry. */
	validations: readonly ValidationRegistrationConstraint[];
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
	private readonly layout: LayoutTheme;
	private readonly validationRegistry: ValidationRegistry;

	/**
	 * @remarks
	 * Shares the registries it receives instead of copying them. They are
	 * read-only, so engines built by `extend` can share them safely. Construct
	 * engines with `createFormEngine`; passing a registry that changes later is
	 * unsupported.
	 */
	constructor(registries: EngineRegistries) {
		this.registries = {
			elements: registries.elements,
			recipes: registries.recipes,
			actions: registries.actions,
			schemaArtifacts: registries.schemaArtifacts,
			layout: registries.layout,
			validationRegistry: registries.validationRegistry,
			validations: registries.validations,
			defaultWizardRecipe: registries.defaultWizardRecipe,
		};
		this.schemaArtifacts = registries.schemaArtifacts;
		this.layout = registries.layout;
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
		return [...this.registries.elements.all()];
	}

	getElementIds(): string[] {
		return [...this.registries.elements.keys()];
	}

	hasElement(id: string): boolean {
		return this.registries.elements.has(id);
	}

	getRecipe(id: string): AnyRecipeRegistration | undefined {
		return this.registries.recipes.get(id);
	}

	getAllRecipes(): AnyRecipeRegistration[] {
		return [...this.registries.recipes.all()];
	}

	getRecipeIds(): string[] {
		return [...this.registries.recipes.keys()];
	}

	hasRecipe(id: string): boolean {
		return this.registries.recipes.has(id);
	}

	/**
	 * The engine's immutable layout theme: grid vocabulary, appearance vocabulary, one id and one stylesheet.
	 *
	 * @remarks
	 * Compiled once when the engine is built (or taken as given from `createFormEngine({ layout })`).
	 * Renderers emit `css` inside the rendered form markup, so SSR output is styled with no FOUC and
	 * no runtime injection, and put `id` on the form, grid and item elements as `data-se-theme`.
	 * Engines built on the same theme share its id; React hoists the shared stylesheet to one
	 * element, while Radiant inlines an identical copy per form.
	 */
	getLayout(): LayoutTheme {
		return this.layout;
	}

	getValidationRegistry(): ValidationRegistry {
		return this.validationRegistry;
	}

	getAction(id: string): AnyActionRegistration | undefined {
		return this.registries.actions.get(id);
	}

	getAllActions(): AnyActionRegistration[] {
		return [...this.registries.actions.all()];
	}

	getActionTypes(): string[] {
		return [...this.registries.actions.keys()];
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
		return validateFormConfig(config, this.validateOptions()) as unknown as NormalizedFormConfig<
			TOutputs['elements'],
			TOutputs['recipes'],
			TOutputs['actions']
		>;
	}

	/**
	 * Same validation as {@link validateForm}, returned as a result instead of thrown.
	 *
	 * @returns `{ success: true, data }` with the frozen normalized form, or `{ success: false, issues }`
	 * with the problems found and the config path each is about (`['steps', 0, 'elements', 2, 'grid', 'width']`;
	 * `[]` for the whole form). The shape fits a YAML or editor integration that points an issue at a location.
	 *
	 * @remarks
	 * A malformed form envelope (its own shape, such as `steps` not being an array) stops the deeper
	 * checks and is reported alone; once it parses, element, action, grid and view issues come together.
	 *
	 * Still throws for a misuse of the API, such as a registration whose Standard Schema is async.
	 */
	safeValidateForm(
		config: unknown,
	): FormValidationResult<NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>> {
		return safeValidateFormConfig(config, this.validateOptions()) as FormValidationResult<
			NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>
		>;
	}

	private validateOptions() {
		return {
			owner: this,
			getRecipe: (id: string) => this.getRecipe(id),
			defaultWizardRecipe: this.registries.defaultWizardRecipe,
			getElement: (id: string) => this.getElement(id),
			getAction: (id: string) => this.getAction(id),
			hasValidation: (type: string) => this.validationRegistry.has(type),
			axes: this.layout.axes,
		};
	}

	/**
	 * Author a form from this engine's registered elements, recipes, and actions.
	 * Same runtime pipeline as {@link validateForm}.
	 */
	defineForm<
		const TConfig extends FormAuthoringInput<TElements, TRecipes, TActions, TAppearance> & {
			/** @remarks Rejects the callbacks `FormConfig` no longer has, which an inferred generic would let through. */
			onSubmit?: never;
			onChange?: never;
		},
	>(
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
			axes: this.layout.axes,
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
	 *
	 * Uses the schema the export lists the recipe by, which lists each slot's declared appearance axes,
	 * so a view document gets the same autocomplete as the form config.
	 */
	private generateRecipeViewSchema(recipe: AnyRecipeRegistration): Record<string, unknown> {
		const id = SchemaMetadataCatalog.entryId(ComponentType.Recipe, recipe.$type);
		try {
			return generateZodJSONSchemaDocument(
				(this.schemaArtifacts.exportSchemas.get(id) ?? recipe.schema) as z.ZodMiniType,
				this.schemaArtifacts.metadataRegistry,
				{
					target: 'draft-2020-12',
					io: 'input',
					schemaId: id,
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

	/**
	 * JSON Schema of the form config authors write, for editor autocomplete.
	 *
	 * @remarks
	 * `io` defaults to `'input'`, as it does for {@link FormEngine.generateJSONSchemaCollection} and
	 * {@link FormEngine.generateActionConfigSchema}: the export describes what authors write, and an element
	 * schema that pipes a transform (Radiant's `input-otp`) has no JSON Schema for its output side, so
	 * `io: 'output'` throws for an engine that registers one.
	 */
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
			validations: [...this.registries.validations, ...(options?.validations ?? [])],
			catalog: options?.catalog ?? this.schemaArtifacts.metadataCatalog,
			layout: this.layout,
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
