import type { FormConfig, FormConfigEnvelope, FormStep, FormTaggedConfig } from '@/schemas/form-config';
import { formConfigEnvelopeSchema } from '@/schemas/form-config';
import type { BuilderActionRegistration, InputRegistration, RecipeRegistration, StaticRegistration } from '@/types';
import { safeParseStandardSchema, type StandardSchemaIssue } from '@/lib/standard-schema';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { isValidatedFormConfig, markValidatedFormConfig } from '@/lib/normalized-form-config';

export { isValidatedFormConfig, markValidatedFormConfig } from '@/lib/normalized-form-config';
export type { ValidatedFormConfig } from '@/lib/normalized-form-config';

/** Implicit `view.$type` for multi-step forms that omit `view`. */
export const DEFAULT_WIZARD_RECIPE = 'bare-controls';

export class FormValidationError extends Error {
	constructor(
		message: string,
		public readonly issues: string[] = [],
	) {
		super(message);
		this.name = 'FormValidationError';
	}
}

type ElementRegistration = InputRegistration<any, any, any> | StaticRegistration<any, any, any>;

export interface ValidateFormOptions {
	getRecipe: (id: string) => RecipeRegistration<any, any> | undefined;
	getElement: (id: string) => ElementRegistration | undefined;
	getAction: (id: string) => BuilderActionRegistration | undefined;
	parseFormConfig?: (config: unknown) => FormConfig;
}

/**
 * Engine-shaped lookup passed to {@link resolveFormRecipe}.
 *
 * Pass the `FormEngine` instance (or a stable `{ getRecipe }` object). Object
 * identity is the warn-cache key: a new lambda every render will warn on every
 * render.
 */
export interface RecipeLookup {
	getRecipe: (id: string) => RecipeRegistration<any, any> | undefined;
}

/** Getter form still accepted so a `(id) => engine.getRecipe(id)` lambda does not crash. */
export type RecipeGetter = RecipeLookup['getRecipe'];

export type RecipeResolver = RecipeLookup | RecipeGetter;

/** Per-engine form ids already warned, so re-renders of the same engine do not spam. */
const warnedMultiStepForms = new WeakMap<object, Set<string>>();

function isRecipeLookup(lookup: RecipeResolver): lookup is RecipeLookup {
	return typeof lookup === 'object' && lookup !== null && typeof lookup.getRecipe === 'function';
}

function getRecipeFromLookup(lookup: RecipeResolver | undefined, id: string) {
	if (!lookup) return undefined;
	if (typeof lookup === 'function') return lookup(id);
	if (isRecipeLookup(lookup)) return lookup.getRecipe(id);
	return undefined;
}

function assertRecipeResolver(lookup: RecipeResolver): void {
	if (typeof lookup === 'function' || isRecipeLookup(lookup)) return;
	throw new Error(
		'The supplied engine has no getRecipe(). Pass a live FormEngine instance — class methods do not survive HTML attributes or Storybook arg serialization.',
	);
}

function warnMissingDefaultWizard(lookup: object, config: FormConfig) {
	let warned = warnedMultiStepForms.get(lookup);
	if (!warned) {
		warned = new Set();
		warnedMultiStepForms.set(lookup, warned);
	}
	if (warned.has(config.id)) return;
	warned.add(config.id);
	console.warn(
		`Form '${config.id}' has ${config.steps.length} steps but no '${DEFAULT_WIZARD_RECIPE}' recipe is registered. ` +
			'The form renders every step on a single page without a view layout. ' +
			'Register a wizard recipe with FormComposer.addRecipe() (or addRecipes()) or set an explicit view.$type.',
	);
}

function formatIssuePath(path: StandardSchemaIssue['path']): string {
	if (!path?.length) return '';
	return path.map(String).join('.');
}

function formatSchemaIssues(issues: StandardSchemaIssue[]): string {
	return issues
		.map((issue) => {
			const path = formatIssuePath(issue.path);
			return path ? `${issue.message} (${path})` : issue.message;
		})
		.join(', ');
}

function itemLocation(kind: string, index: number, item: { id?: unknown }): string {
	const id = typeof item.id === 'string' && item.id ? ` (id: '${item.id}')` : '';
	return `${kind}[${index}]${id}`;
}

function prefixed(location: string, message: string): string {
	return `${location}: ${message}`;
}

/**
 * Resolves the view recipe for a form at render time.
 *
 * - Explicit `view.$type`: looks up that recipe. Throws if `lookup` is missing
 *   or the type is unregistered. `lookup` may be a FormEngine, `{ getRecipe }`,
 *   or a `(id) => recipe` getter.
 * - No `view`, one step or fewer: returns `undefined` (fields only).
 * - No `view`, two or more steps: looks up {@link DEFAULT_WIZARD_RECIPE}.
 * - Engine present but that recipe is missing: warns once per engine/form id
 *   and returns `undefined`. `validateForm` / `defineForm` still succeed.
 * - No `lookup` (engine-less render): stays silent and returns `undefined`.
 */
export function resolveFormRecipe(
	config: FormConfig,
	lookup?: RecipeResolver,
): RecipeRegistration<any, any> | undefined {
	const requestedType = config.view?.$type;
	if (requestedType) {
		if (!lookup) {
			throw new Error(`Form '${config.id}' uses view '${requestedType}' but no FormEngine was supplied.`);
		}
		assertRecipeResolver(lookup);
		const recipe = getRecipeFromLookup(lookup, requestedType);
		if (!recipe) {
			throw new Error(`Unknown view recipe '${requestedType}'. Register it with FormComposer.addRecipe().`);
		}
		return recipe;
	}

	if (config.steps.length <= 1) return undefined;
	if (!lookup) return undefined;

	assertRecipeResolver(lookup);
	const recipe = getRecipeFromLookup(lookup, DEFAULT_WIZARD_RECIPE);
	if (recipe) return recipe;

	warnMissingDefaultWizard(lookup, config);
	return undefined;
}

/**
 * Steps to paint for a resolved recipe.
 *
 * A recipe owns wizard navigation, so only the current step is rendered.
 * Without a recipe, every step is flattened onto one page so later fields stay reachable.
 */
export function getRenderableSteps(
	config: FormConfig,
	recipe: RecipeRegistration<any, any> | undefined,
	currentStep: number,
): FormStep[] {
	if (recipe) {
		const step = config.steps[currentStep] ?? config.steps[0];
		return step ? [step] : [];
	}
	return config.steps;
}

export function resolveValidatedConfig(
	config: FormConfig,
	engine?: { validateForm: (config: unknown) => FormConfig },
): FormConfig {
	if (isValidatedFormConfig(config)) return config;
	if (engine) return engine.validateForm(config);
	if (config.view) {
		throw new Error(`Form '${config.id}' uses view '${config.view.$type}' but no FormEngine was supplied.`);
	}
	return config;
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; issue: string };

function isTaggedConfig(value: unknown): value is FormTaggedConfig {
	return typeof value === 'object' && value !== null && '$type' in value && typeof value.$type === 'string';
}

function parseRegistration(
	schema: StandardSchemaV1<unknown>,
	config: object,
	invalidPrefix: string,
): ParseResult<unknown> {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		return { ok: false, issue: `${invalidPrefix}: ${formatSchemaIssues(result.error.issues)}` };
	}
	return { ok: true, data: result.data };
}

function parseView(
	view: FormTaggedConfig | undefined,
	stepCount: number,
	getRecipe: ValidateFormOptions['getRecipe'],
): { issues: string[]; view?: FormTaggedConfig } {
	if (!view) {
		return { issues: stepCount === 0 ? ['Form must have at least one step.'] : [] };
	}

	const recipeType = view.$type;
	if (!recipeType) {
		return { issues: ['view.$type must be a non-empty string.'] };
	}

	const recipe = getRecipe(recipeType);
	if (!recipe) {
		return { issues: [`Unknown view recipe '${recipeType}'. Register it with FormComposer.addRecipe().`] };
	}

	const issues: string[] = [];
	if (recipe.kind === 'single-step' && stepCount !== 1) {
		issues.push(
			`Recipe '${recipeType}' is single-step only (kind: 'single-step') but the form has ${stepCount} steps.`,
		);
	}
	if (recipe.kind === 'wizard' && stepCount < 2) {
		issues.push(
			`Recipe '${recipeType}' requires at least 2 steps (kind: 'wizard') but the form has ${stepCount} step(s).`,
		);
	}

	const parsed = parseRegistration(recipe.schema, view, `Invalid view configuration for recipe '${recipeType}'`);
	if (!parsed.ok) {
		issues.push(parsed.issue);
		return { issues, view };
	}
	if (!isTaggedConfig(parsed.data)) {
		issues.push(`Invalid view configuration for recipe '${recipeType}': parsed output is missing $type.`);
		return { issues, view };
	}

	const allowedSlots = new Set<string>(recipe.slots);
	for (const key of Object.keys(view)) {
		if (key === '$type') continue;
		if (!allowedSlots.has(key)) {
			issues.push(
				`Recipe '${recipeType}' does not accept view key '${key}'. Allowed: ${[...allowedSlots].join(', ') || '(none)'}.`,
			);
		}
	}

	return { issues, view: parsed.data };
}

function parseTypedConfig(
	kind: 'element' | 'action',
	item: FormTaggedConfig,
	getRegistration: (id: string) => { schema: StandardSchemaV1<unknown> } | undefined,
	registerHint: string,
): ParseResult<FormTaggedConfig> {
	const registration = getRegistration(item.$type);
	if (!registration) {
		return { ok: false, issue: `Unknown ${kind} type '${item.$type}'. Register it with ${registerHint}.` };
	}

	const parsed = parseRegistration(registration.schema, item, `Invalid ${kind} configuration for '${item.$type}'`);
	if (!parsed.ok) return parsed;
	if (!isTaggedConfig(parsed.data)) {
		return {
			ok: false,
			issue: `Invalid ${kind} configuration for '${item.$type}': parsed output is missing $type.`,
		};
	}
	return { ok: true, data: parsed.data };
}

function parseTypedList(
	items: FormTaggedConfig[] | undefined,
	kind: 'element' | 'action',
	getRegistration: (id: string) => { schema: StandardSchemaV1<unknown> } | undefined,
	registerHint: string,
	parentLocation: string,
	itemKind: string,
): { issues: string[]; items?: FormTaggedConfig[] } {
	if (!items) return { issues: [] };

	const next: FormTaggedConfig[] = [];
	const issues: string[] = [];
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		const location = `${parentLocation} ${itemLocation(itemKind, index, { id: item.id })}`;
		const result = parseTypedConfig(kind, item, getRegistration, registerHint);
		if (!result.ok) {
			issues.push(prefixed(location, result.issue));
			continue;
		}
		next.push(result.data);
	}
	return { issues, items: next };
}

/**
 * Strict validation for a form configuration against the engine's registered recipes and schema.
 * Returns a new config: schema defaults and transforms are kept, the input object is not mutated.
 */
export function validateFormConfig(config: unknown, options: ValidateFormOptions): FormConfig {
	if (isValidatedFormConfig(config)) {
		return config;
	}

	let envelope: FormConfigEnvelope;
	try {
		envelope = formConfigEnvelopeSchema.parse(
			options.parseFormConfig ? options.parseFormConfig(config) : config,
		) as FormConfigEnvelope;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new FormValidationError(`Invalid form configuration: ${message}`, [message]);
	}

	const issues: string[] = [];
	const parseActions = (items: FormTaggedConfig[] | undefined, parentLocation: string, itemKind: string) =>
		parseTypedList(items, 'action', options.getAction, 'FormComposer.addAction()', parentLocation, itemKind);

	const steps = envelope.steps.map((step, stepIndex) => {
		const stepLocation = itemLocation('steps', stepIndex, step);
		const elements = parseTypedList(
			step.elements,
			'element',
			options.getElement,
			'FormComposer.addElement()',
			stepLocation,
			'elements',
		);
		const actions = parseActions(step.actions, stepLocation, 'actions');
		const onStepEnter = parseActions(step.onStepEnter, stepLocation, 'onStepEnter');
		const onStepLeave = parseActions(step.onStepLeave, stepLocation, 'onStepLeave');
		const onStepValidate = parseActions(step.onStepValidate, stepLocation, 'onStepValidate');
		issues.push(
			...elements.issues,
			...actions.issues,
			...onStepEnter.issues,
			...onStepLeave.issues,
			...onStepValidate.issues,
		);
		return {
			...step,
			elements: elements.items ?? step.elements,
			actions: actions.items ?? step.actions,
			onStepEnter: onStepEnter.items ?? step.onStepEnter,
			onStepLeave: onStepLeave.items ?? step.onStepLeave,
			onStepValidate: onStepValidate.items ?? step.onStepValidate,
		};
	});

	const view = parseView(
		envelope.view && typeof envelope.view.$type === 'string' ? envelope.view : undefined,
		envelope.steps.length,
		options.getRecipe,
	);
	const formActions = parseActions(envelope.actions, 'form', 'actions');
	issues.push(...view.issues, ...formActions.issues);

	if (issues.length > 0) {
		throw new FormValidationError(issues[0] ?? 'Invalid form configuration', issues);
	}

	return markValidatedFormConfig({
		...envelope,
		steps,
		view: view.view ?? envelope.view,
		actions: formActions.items ?? envelope.actions,
	} as FormConfig);
}
