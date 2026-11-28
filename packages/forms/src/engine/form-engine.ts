import type { CsrfPolicy, FormFetch } from '@/lib/form-fetch.js';
import type { FormIssueFormatter } from '@/state-container/types.js';
import type { AnyRecipeRegistration } from '@/types/registration.js';
import type { ActionRegistry, ElementRegistry, RecipeRegistry } from '@/registries/index.js';
import { ComponentType } from './component-type.js';
import { logger } from '@/lib/logger.js';
import type { StandardJSONSchemaV1 } from '@/lib/standard-json-schema.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { JSONSchemaTarget } from '@schema-engine/registry';
import * as z from 'zod/mini';
import type { FormEngineSchemaArtifacts } from './schema-artifacts.js';
import {
	safeValidateFormConfig,
	validateElementConfig,
	validateFormConfig,
	type FormValidationResult,
} from '@/lib/validate-form.js';
import type { NormalizedElementConfig, NormalizedFormConfig, ValuesBrand } from '@/lib/normalized-form-config.js';
import type { ExactFormAppearance, ExactViewConfig, FormAuthoringInput } from '@/builder/form-authoring.js';
import type {
	LastWinsMerge,
	EngineOutputMaps,
	MergedOutputMap,
	MergedValueMap,
	MergedRegistrationMap,
	MergedActionRegistrationMap,
	ElementRegistrationConstraint,
	RecipeRegistrationConstraint,
	ActionRegistrationConstraint,
} from '@/builder/types.utils.js';
import type { ExtendFormEngineOptions } from './create-form-engine.js';
import type { ValuesOf } from '@/builder/form-values.js';
import type { FormValues } from '@/runtime/types.js';
import { buildFormEngine } from './build-form-engine.js';
import { SchemaMetadataCatalog } from './schema-metadata-catalog.js';
import type { LayoutTheme, ResolvedAppearanceAxes } from '@schema-engine/layout';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry.js';
import type { ValidationRegistrationConstraint } from '@/schemas/validation/types.js';
import {
	describeRecipeFromRegistration,
	describeViewCatalogFromRecipes,
	getAuthoringInstructionsFromCatalog,
} from '@/lib/authoring-catalog.js';
import type { RecipeDescriptor, ViewCatalog } from '@/recipes/types.js';
import { generateZodJSONSchemaDocument } from '@/lib/zod-json-schema.js';
import { createSubmissionSchema, type SubmissionSchema, type SubmissionSchemaConfig } from './submission-schema.js';
export * from './component-type.js';

/**
 * Engine registries - internal storage for all registered components.
 */
export interface EngineRegistries {
	elements: ElementRegistry;
	recipes: RecipeRegistry;
	actions: ActionRegistry;
	schemaArtifacts: FormEngineSchemaArtifacts;
	layout: LayoutTheme;
	validationRegistry: ValidationRegistry;
	/** The validations passed to `createFormEngine`, kept so {@link FormEngine.extend} can rebuild the registry. */
	validations: readonly ValidationRegistrationConstraint[];
	defaultWizardRecipe?: string;
	formatIssue?: FormIssueFormatter;
	/** The engine's request function, with the CSRF policy applied. */
	fetch: FormFetch;
	/** The `fetch` given to `createFormEngine`, without the policy, so {@link FormEngine.extend} can rebuild. */
	baseFetch?: FormFetch;
	csrf?: CsrfPolicy;
}

/** What `validateForm` takes beside the config: the application's schema of the submitted values. */
export interface ValidateFormValuesOption<TSchema extends StandardSchemaV1 = StandardSchemaV1> {
	readonly values: TSchema;
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
	private readonly submissionSchemas = new WeakMap<object, SubmissionSchema>();

	/**
	 * Every request the engine makes goes through this: the `fetch` given to `createFormEngine`, or the global one,
	 * with the CSRF policy applied. Bindings and actions use it (`context.fetch`) so no one remembers a token.
	 */
	readonly fetch: FormFetch;

	/**
	 * The registered elements, read-only. `elements.get(id)` finds one, and `all()` and `keys()` list them in
	 * first-registration order, as frozen arrays.
	 */
	readonly elements: ElementRegistry;

	/** The registered view recipes, read-only, with the read side of {@link FormEngine.elements}. */
	readonly recipes: RecipeRegistry;

	/**
	 * The registered actions, read-only, with the read side of {@link FormEngine.elements}.
	 *
	 * @remarks
	 * It is a lookup the actions package reads: `new ActionDispatcher(engine.actions)` and
	 * `parseActions(engine.actions, input)` take it as it is.
	 */
	readonly actions: ActionRegistry;

	/** The registered validation rules, read-only, which also checks a rule of an element with `check`. */
	readonly validations: ValidationRegistry;

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
			formatIssue: registries.formatIssue,
			fetch: registries.fetch,
			baseFetch: registries.baseFetch,
			csrf: registries.csrf,
		};
		this.fetch = registries.fetch;
		this.schemaArtifacts = registries.schemaArtifacts;
		this.layout = registries.layout;
		this.elements = registries.elements;
		this.recipes = registries.recipes;
		this.actions = registries.actions;
		this.validations = registries.validationRegistry;

		logger.debug('FormEngine initialized', {
			elements: this.registries.elements.size,
			recipes: this.registries.recipes.size,
			actions: this.registries.actions.size,
		});
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

	/** The formatter of issues given to `createFormEngine`, which both renderer bindings read; `undefined` when none was. */
	getIssueFormatter(): FormIssueFormatter | undefined {
		return this.registries.formatIssue;
	}

	/** The CSRF policy given to `createFormEngine`, for a binding that adds a hidden input to a native post; `undefined` when there is none. */
	getCsrf(): CsrfPolicy | undefined {
		return this.registries.csrf;
	}

	getSummary() {
		return {
			elements: {
				count: this.registries.elements.size,
				ids: [...this.elements.keys()],
			},
			recipes: {
				count: this.registries.recipes.size,
				ids: [...this.recipes.keys()],
			},
			actions: {
				count: this.registries.actions.size,
				types: [...this.actions.keys()],
			},
		};
	}

	/**
	 * Validate external JSON against this engine's registrations.
	 * Applies defaults and schema transforms. Prefer {@link defineForm} when authoring in TypeScript.
	 * Returns a frozen {@link NormalizedFormConfig} owned by this engine.
	 *
	 * @remarks
	 * A config that arrives as JSON cannot be typed by inference, so the application binds the schema of what it
	 * submits with `values`: the runtime parses a submission with it after the one derived from the elements, and
	 * the values type of the form is its output. Without `values`, `onSubmit` receives {@link FormValues}, still
	 * checked at runtime by {@link FormEngine.submissionSchema}. A form that is already normalized keeps its own values
	 * type, and anything else (JSON, an authoring object) gives `FormValues`, so it is not a form of a narrower type: the
	 * values type is a claim only a normalized form can make, and naming one for plain input is a type error.
	 */
	validateForm<TValues extends FormValues = FormValues>(
		config: ValuesBrand<TValues>,
	): NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions'], NoInfer<TValues>>;
	validateForm(
		config: unknown,
	): NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions'], FormValues>;
	validateForm<TSchema extends StandardSchemaV1>(
		config: unknown,
		options: ValidateFormValuesOption<TSchema>,
	): NormalizedFormConfig<
		TOutputs['elements'],
		TOutputs['recipes'],
		TOutputs['actions'],
		StandardSchemaV1.InferOutput<TSchema>
	>;
	validateForm(config: unknown, options?: ValidateFormValuesOption): unknown {
		return validateFormConfig(config, this.validateOptions(options?.values));
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
	): FormValidationResult<
		NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions'], FormValues>
	>;
	safeValidateForm<TSchema extends StandardSchemaV1>(
		config: unknown,
		options: ValidateFormValuesOption<TSchema>,
	): FormValidationResult<
		NormalizedFormConfig<
			TOutputs['elements'],
			TOutputs['recipes'],
			TOutputs['actions'],
			StandardSchemaV1.InferOutput<TSchema>
		>
	>;
	safeValidateForm(config: unknown, options?: ValidateFormValuesOption): unknown {
		return safeValidateFormConfig(config, this.validateOptions(options?.values));
	}

	private validateOptions(values?: StandardSchemaV1) {
		return {
			values,
			owner: this,
			recipes: this.recipes,
			defaultWizardRecipe: this.registries.defaultWizardRecipe,
			elements: this.elements,
			actions: this.actions,
			checkRule: (rule: { $type: string }) => this.validations.check(rule),
			axes: this.layout.axes,
		};
	}

	/**
	 * Author a form from this engine's registered elements, recipes, and actions.
	 * Same runtime pipeline as {@link validateForm}.
	 *
	 * @remarks
	 * The result carries the values type the literal config declares ({@link ValuesOf}), which a renderer reads to
	 * type `onSubmit`, `onAction` and `defaultValues`. A config that is not a literal gives {@link FormValues}.
	 *
	 * The type is derived from the literal, not from this call's result: it is the static twin of
	 * {@link FormEngine.submissionSchema}, which `createFormRuntime` checks every submission against.
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
	): NormalizedFormConfig<
		TOutputs['elements'],
		TOutputs['recipes'],
		TOutputs['actions'],
		ValuesOf<TConfig, TOutputs['values']>
	> {
		return this.validateForm(config) as NormalizedFormConfig<
			TOutputs['elements'],
			TOutputs['recipes'],
			TOutputs['actions'],
			ValuesOf<TConfig, TOutputs['values']>
		>;
	}

	/**
	 * The schema of the values a submission of `config` holds, composed from the `value` its elements declare.
	 *
	 * @remarks
	 * It follows the rules the form state container submits by: dotted names nest, named containers become
	 * objects, a container of kind `array` becomes a list, a one-child row is a list of values (unless its child is a container of its own, which makes the rows objects), and the config's
	 * `payload` keys are added. A field is a required key only when it has a `required` rule and neither it, a
	 * container around it nor its step has `constraints` or `disabled`; any other key may be absent, and an
	 * optional leaf field may hold its empty value (`''` or `null`), and a list or a group its empty list or object. Keys no field declares are not part of it.
	 * `createFormRuntime` parses every submission with it, so one that does not match fails with a
	 * `valueMismatch` issue. Its `~standard.jsonSchema` `input()` and `output()` throw for a value schema that has no JSON Schema.
	 */
	submissionSchema(config: SubmissionSchemaConfig): SubmissionSchema {
		const known = this.submissionSchemas.get(config);
		if (known) return known;
		const created = createSubmissionSchema(config, { elements: this.elements, validations: this.validations });
		this.submissionSchemas.set(config, created);
		return created;
	}

	/**
	 * Validate a single element against this engine's registrations, including nested children.
	 * Use for standalone or dynamically created fields that are not already inside a normalized form.
	 * The normalized marker is applied only after this element and its children succeed.
	 */
	validateElement(config: unknown): NormalizedElementConfig<TOutputs['elements']> {
		return validateElementConfig(config, {
			elements: this.elements,
			checkRule: (rule) => this.validations.check(rule),
			axes: this.layout.axes,
		}) as unknown as NormalizedElementConfig<TOutputs['elements']>;
	}

	describeRecipe($type: string): RecipeDescriptor {
		const recipe = this.recipes.get($type);
		if (!recipe) {
			throw new Error(`Unknown recipe '${$type}'. Register it with createFormEngine({ recipes: [...] }).`);
		}
		return describeRecipeFromRegistration(recipe, (r) => this.generateRecipeViewSchema(r));
	}

	describeViewCatalog(): ViewCatalog {
		return describeViewCatalogFromRecipes(this.recipes.all(), (r) => this.generateRecipeViewSchema(r));
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

	getFormConfigStandardSchema(): StandardJSONSchemaV1 {
		return this.schemaArtifacts.jsonSchema.formConfigStandardSchema;
	}

	getActionConfigStandardSchema(actionType: string): StandardJSONSchemaV1 | undefined {
		return this.schemaArtifacts.jsonSchema.actionConfigStandardSchemas[actionType];
	}

	getSchemaCatalog() {
		return this.schemaArtifacts.metadataCatalog;
	}

	/**
	 * The JSON Schema of every registration, one entry each, for a tool that takes a collection of schemas.
	 *
	 * @remarks
	 * `target` is a Standard JSON Schema name (`'draft-2020-12'`, the default, `'draft-07'`, `'draft-04'` or
	 * `'openapi-3.0'`). Any other value throws before a schema is converted, as it does for
	 * {@link FormEngine.generateFormConfigSchema} and {@link FormEngine.generateActionConfigSchema}.
	 */
	generateJSONSchemaCollection(options?: {
		target?: JSONSchemaTarget;
		uri?: (id: string) => string;
		io?: 'input' | 'output';
	}) {
		return this.schemaArtifacts.jsonSchema.generateCollection(options);
	}

	/**
	 * JSON Schema of the form config authors write, for editor autocomplete.
	 *
	 * @remarks
	 * `io` defaults to `'input'`, as it does for {@link FormEngine.generateJSONSchemaCollection} and
	 * {@link FormEngine.generateActionConfigSchema}: the export describes what authors write, and an element
	 * schema that pipes a transform (Radiant's `input-otp`) has no JSON Schema for its output side, so
	 * `io: 'output'` throws for an engine that registers one.
	 *
	 * `target` is a Standard JSON Schema name: `'draft-2020-12'` (the default), `'draft-07'`, `'draft-04'` or
	 * `'openapi-3.0'`. Any other value throws before a schema is converted.
	 */
	generateFormConfigSchema(options?: { target?: JSONSchemaTarget; io?: 'input' | 'output' }) {
		return this.schemaArtifacts.jsonSchema.generateFormConfig(options);
	}

	generateActionConfigSchema(
		actionType: string,
		options?: {
			target?: JSONSchemaTarget;
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
			values: LastWinsMerge<TOutputs['values'], MergedValueMap<TNewElements>>;
		},
		TAppearance
	> {
		return buildFormEngine({
			elements: [...this.elements.all(), ...(options?.elements ?? [])],
			recipes: [...this.recipes.all(), ...(options?.recipes ?? [])],
			actions: [...this.actions.all(), ...(options?.actions ?? [])],
			validations: [...this.registries.validations, ...(options?.validations ?? [])],
			catalog: options?.catalog ?? this.schemaArtifacts.metadataCatalog,
			layout: this.layout,
			defaultWizardRecipe: this.registries.defaultWizardRecipe,
			formatIssue: this.registries.formatIssue,
			fetch: this.registries.baseFetch,
			csrf: this.registries.csrf,
		}) as unknown as FormEngine<
			LastWinsMerge<TElements, MergedRegistrationMap<TNewElements>>,
			LastWinsMerge<TRecipes, MergedRegistrationMap<TNewRecipes>>,
			LastWinsMerge<TActions, MergedActionRegistrationMap<TNewActions>>,
			{
				elements: LastWinsMerge<TOutputs['elements'], MergedOutputMap<TNewElements>>;
				recipes: LastWinsMerge<TOutputs['recipes'], MergedOutputMap<TNewRecipes>>;
				actions: LastWinsMerge<TOutputs['actions'], MergedOutputMap<TNewActions>>;
				values: LastWinsMerge<TOutputs['values'], MergedValueMap<TNewElements>>;
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

export type { EngineOutputMaps } from '@/builder/types.utils.js';
