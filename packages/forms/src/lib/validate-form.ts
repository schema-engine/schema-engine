import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import type { FormConfig, FormConfigEnvelope, FormTaggedConfig } from '@/schemas/form-config';
import type { GridLayoutConfig } from '@/schemas/base-field';
import type { ElementConfig } from '@/schemas/field-config';
import { formConfigEnvelopeSchema } from '@/schemas/form-config';
import { safeParseStandardSchema, type StandardSchemaIssue } from '@/lib/standard-schema';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
	markNormalizedElementConfig,
	markNormalizedFormConfig,
	getNormalizedFormOwner,
	type NormalizedElementConfig,
	type NormalizedFormConfig,
} from '@/lib/normalized-form-config';
import { getElementChildren, withElementChildren } from '@/lib/element-children';
import { DEFAULT_WIZARD_RECIPE } from '@/lib/form-view';
import {
	elementGridKeys,
	elementUsesGridWidths,
	GRID_TEMPLATE_KEYS,
	namedPlacementOverflow,
	WIDTH_TRACKS,
} from '@/lib/grid-placement';
import { logger } from '@/lib/logger';
import { mergeSlotDefaults } from '@/recipes/merge-slot-defaults';
import { isPlainObject } from '@/lib/is-plain-object';
import {
	checkAppearance,
	getDefaultCompiledAppearance,
	pickSupportedAppearance,
	type CompiledAppearance,
} from '@/lib/appearance';

export type { FormConfigView, NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps } from '@/lib/form-view';

export class FormValidationError extends Error {
	constructor(
		message: string,
		public readonly issues: string[] = [],
	) {
		super(message);
		this.name = 'FormValidationError';
	}
}

type ElementRegistration = AnyElementRegistration;

export interface ValidateFormOptions {
	/** Engine (or other owner) that produced this validation. Required to skip re-validation. */
	owner: object;
	getRecipe: (id: string) => AnyRecipeRegistration | undefined;
	/** `view.$type` written for a multi-step form that omits `view`. Defaults to {@link DEFAULT_WIZARD_RECIPE}. */
	defaultWizardRecipe?: string;
	getElement: (id: string) => ElementRegistration | undefined;
	getAction: (id: string) => AnyActionRegistration | undefined;
	hasValidation: (type: string) => boolean;
	parseFormConfig?: (config: unknown) => FormConfig;
	/** Appearance vocabulary the picks are checked against. Defaults to the built-in `size` and `surface` axes. */
	appearance?: CompiledAppearance;
}

/**
 * Appearance picks that reach an element: the vocabulary, and what the form, step and containing elements chose.
 */
interface AppearanceScope {
	axes: CompiledAppearance['axes'];
	inherited: Readonly<Record<string, string>>;
}

function formatIssuePath(path: StandardSchemaIssue['path']): string {
	if (!path?.length) return '';
	return path
		.map((segment) => {
			if (typeof segment === 'object' && segment !== null && 'key' in segment) {
				return String(segment.key);
			}
			return String(segment);
		})
		.join('.');
}

function formatSchemaIssues(issues: StandardSchemaIssue[]): string {
	return issues
		.map((issue) => {
			const path = formatIssuePath(issue.path);
			const keys =
				'keys' in issue && Array.isArray(issue.keys)
					? issue.keys.filter(
							(key): key is PropertyKey =>
								typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol',
						)
					: [];
			const message = keys.length > 0 ? `${issue.message} (${keys.map(String).join(', ')})` : issue.message;
			return path ? `${message} (${path})` : message;
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

type ParseResult<T> = { ok: true; data: T } | { ok: false; issue: string };

function isTaggedConfig(value: unknown): value is FormTaggedConfig {
	return typeof value === 'object' && value !== null && '$type' in value && typeof value.$type === 'string';
}

function parseRegistration(schema: StandardSchemaV1, config: object, invalidPrefix: string): ParseResult<unknown> {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		const message = formatSchemaIssues(result.error.issues) || 'Validation failed';
		return { ok: false, issue: `${invalidPrefix}: ${message}` };
	}
	return { ok: true, data: result.data };
}

/**
 * Form ids already warned about, per owner.
 *
 * @remarks
 * A renderer re-validates an inline raw config on every render, so the missing-recipe warning
 * would otherwise repeat for the same form.
 */
const warnedMissingWizardRecipe = new WeakMap<object, Set<string>>();

function parseView(
	authored: FormTaggedConfig | undefined,
	form: { id: string; stepCount: number },
	options: Pick<ValidateFormOptions, 'getRecipe' | 'defaultWizardRecipe' | 'owner'>,
	appearance: AppearanceScope,
): { issues: string[]; view?: FormTaggedConfig } {
	const { getRecipe } = options;
	const stepCount = form.stepCount;
	let view = authored;
	if (!view) {
		if (stepCount === 0) return { issues: ['Form must have at least one step.'] };
		if (stepCount < 2) return { issues: [] };
		const defaultRecipe = options.defaultWizardRecipe ?? DEFAULT_WIZARD_RECIPE;
		if (!getRecipe(defaultRecipe)) {
			const warned = warnedMissingWizardRecipe.get(options.owner) ?? new Set<string>();
			warnedMissingWizardRecipe.set(options.owner, warned);
			if (warned.has(form.id)) return { issues: [] };
			warned.add(form.id);
			logger.warn(
				`Form '${form.id}' has ${stepCount} steps but no '${defaultRecipe}' recipe is registered. The form renders every step on a single page without a view layout. Register a wizard recipe with createFormEngine({ recipes: [...] }) or set an explicit view.$type.`,
			);
			return { issues: [] };
		}
		view = { $type: defaultRecipe };
	}

	const recipeType = view.$type;
	if (!recipeType) {
		return { issues: ['view.$type must be a non-empty string.'] };
	}

	const recipe = getRecipe(recipeType);
	if (!recipe) {
		return {
			issues: [`Unknown view recipe '${recipeType}'. Register it with createFormEngine({ recipes: [...] }).`],
		};
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

	const slotAppearance = resolveSlotAppearance(view, recipe, appearance, issues);
	const parsed = parseRegistration(
		recipe.schema,
		mergeSlotDefaults(slotAppearance.withoutAppearance, recipe.slotDefaults),
		`Invalid view configuration for recipe '${recipeType}'`,
	);
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

	return { issues, view: withSlotAppearance(parsed.data, slotAppearance.resolved) };
}

/**
 * Checks each slot's authored `appearance` and resolves the selection the slot renders with.
 *
 * @remarks
 * The key is removed from the view before the slot schemas parse it, so a registration's slot
 * schema only has to type it; the engine owns the vocabulary check. The form's picks reach a
 * slot for the axes the recipe declares on it, and the slot's own pick wins.
 */
function resolveSlotAppearance(
	view: FormTaggedConfig,
	recipe: AnyRecipeRegistration,
	appearance: AppearanceScope,
	issues: string[],
): { withoutAppearance: FormTaggedConfig; resolved: Record<string, Record<string, string>> } {
	const withoutAppearance: FormTaggedConfig = { ...view };
	const resolved: Record<string, Record<string, string>> = {};
	for (const slot of recipe.slots) {
		const authoredSlot = view[slot];
		const supported = recipe.appearanceAxes?.[slot];
		const checked = checkAppearance(isPlainObject(authoredSlot) ? authoredSlot.appearance : undefined, {
			axes: appearance.axes,
			supported: supported ?? [],
			subject: `Slot '${slot}' of recipe '${recipe.$type}'`,
		});
		issues.push(...checked.issues.map((issue) => prefixed(`view.${slot}`, issue)));
		const selection = pickSupportedAppearance({ ...appearance.inherited, ...checked.appearance }, supported);
		if (Object.keys(selection).length > 0) resolved[slot] = selection;
		if (isPlainObject(authoredSlot) && 'appearance' in authoredSlot) {
			const { appearance: _authored, ...rest } = authoredSlot;
			withoutAppearance[slot] = rest;
		}
	}
	return { withoutAppearance, resolved };
}

function withSlotAppearance(
	view: FormTaggedConfig,
	resolved: Record<string, Record<string, string>>,
): FormTaggedConfig {
	const next: FormTaggedConfig = { ...view };
	for (const [slot, selection] of Object.entries(resolved)) {
		const slotConfig = view[slot];
		next[slot] = { ...(isPlainObject(slotConfig) ? slotConfig : {}), appearance: selection };
	}
	return next;
}

function parseTypedConfig(
	kind: 'element' | 'action',
	item: FormTaggedConfig,
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
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
	items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
	kind: 'element' | 'action',
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
	parentLocation: string,
	itemKind: string,
): { issues: string[]; items?: Array<FormTaggedConfig | FormTaggedConfig[]> } {
	if (!items) return { issues: [] };

	const next: Array<FormTaggedConfig | FormTaggedConfig[]> = [];
	const issues: string[] = [];
	const parseItem = (item: FormTaggedConfig, location: string): FormTaggedConfig | undefined => {
		const result = parseTypedConfig(kind, item, getRegistration, registerHint);
		if (!result.ok) {
			issues.push(prefixed(location, result.issue));
			return undefined;
		}
		return result.data;
	};
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		if (Array.isArray(item)) {
			const group = item
				.map((action, actionIndex) =>
					parseItem(
						action,
						`${parentLocation} ${itemKind}[${index}] ${itemLocation('actions', actionIndex, { id: action.id })}`,
					),
				)
				.filter((action): action is FormTaggedConfig => action !== undefined);
			next.push(group);
			continue;
		}
		const location = `${parentLocation} ${itemLocation(itemKind, index, { id: item.id })}`;
		const parsed = parseItem(item, location);
		if (parsed) next.push(parsed);
	}

	return { issues, items: next };
}

function taggedId(item: unknown): unknown {
	if (typeof item === 'object' && item !== null && 'id' in item) {
		return (item as { id?: unknown }).id;
	}
	return undefined;
}

function childLocation(parentLocation: string, index: number, child: unknown): string {
	const nested = itemLocation('elements', index, { id: taggedId(child) });
	return parentLocation ? `${parentLocation} ${nested}` : nested;
}

function unregisteredValidationRule(
	item: FormTaggedConfig,
	hasValidation: ValidateFormOptions['hasValidation'],
): string | undefined {
	if (!Array.isArray(item.rules)) return undefined;

	for (const rule of item.rules) {
		if (typeof rule !== 'object' || rule === null || !('type' in rule) || typeof rule.type !== 'string') {
			continue;
		}
		if (!hasValidation(rule.type)) {
			const fieldName = typeof item.name === 'string' ? `Field '${item.name}'` : 'Element';
			return `${fieldName} uses validation rule '${rule.type}' with no registered handler.`;
		}
	}

	return undefined;
}

function elementLabel(item: Record<string, unknown>): string {
	if (typeof item.name === 'string') return `Field '${item.name}'`;
	return typeof item.id === 'string' ? `Element '${item.id}'` : 'Element';
}

function quotedKeys(keys: readonly string[]): string {
	return keys.map((key) => `'${key}'`).join(' and ');
}

/**
 * Why a field's named placement is invalid, or `undefined` when it is fine.
 *
 * @remarks
 * Applies at every depth: a container lays its children out in a grid of its
 * own, so a nested field's tracks add up the same way a top-level field's do.
 */
function namedPlacementIssue(item: FormTaggedConfig): string | undefined {
	const keys = elementGridKeys(item);
	const named = ['width', 'offset'].filter((key) => keys.has(key));
	if (named.length === 0) return undefined;
	const label = elementLabel(item);
	if (keys.has('column')) {
		return `${label} sets grid ${quotedKeys(named)} and 'column'; use named widths or a raw column, not both.`;
	}
	const overflow = namedPlacementOverflow(item);
	if (overflow) {
		return `${label} sets grid 'width' and 'offset' that span ${overflow.tracks} of ${WIDTH_TRACKS} tracks at ${overflow.slot === 'default' ? 'default' : `'${overflow.slot}'`}; together they must fit in ${WIDTH_TRACKS} tracks.`;
	}
	return undefined;
}

/** A grid sets its own tracks with `columns` or gets twelve from its fields' widths, not both. */
function columnsWithNamedWidths(
	grid: GridLayoutConfig | undefined,
	steps: readonly { elements: readonly FormTaggedConfig[] }[],
): string | undefined {
	const entries = [grid, ...Object.values(grid?.responsive ?? {})];
	const set = GRID_TEMPLATE_KEYS.filter((key) => entries.some((entry) => entry?.[key] !== undefined));
	if (set.length === 0) return undefined;
	for (const step of steps) {
		const element = step.elements.find(elementUsesGridWidths);
		if (element) {
			return `Form grid sets ${quotedKeys(set)} but ${elementLabel(element)} uses 'width' or 'offset'; a grid uses either columns or widths.`;
		}
	}
	return undefined;
}

function parseElementNode(
	item: unknown,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	location: string,
	appearance: AppearanceScope,
): { issues: string[]; item?: FormTaggedConfig } {
	const fail = (message: string) => ({
		issues: [location ? prefixed(location, message) : message],
	});

	if (!isTaggedConfig(item)) {
		return fail('Invalid element configuration: missing $type.');
	}
	const unregisteredRule = unregisteredValidationRule(item, hasValidation);
	if (unregisteredRule) return fail(unregisteredRule);

	const { appearance: authoredAppearance, ...authored } = item;
	const parsed = parseTypedConfig(
		'element',
		authored as FormTaggedConfig,
		getElement,
		'createFormEngine({ elements: [...] })',
	);
	if (!parsed.ok) {
		return fail(parsed.issue);
	}
	const placementIssue = namedPlacementIssue(parsed.data);
	if (placementIssue) return fail(placementIssue);

	const supported = getElement(item.$type)?.appearanceAxes;
	const checked = checkAppearance(authoredAppearance, {
		axes: appearance.axes,
		supported: supported ?? [],
		subject: `Element '${item.$type}'`,
	});
	const issues = checked.issues.map((issue) => (location ? prefixed(location, issue) : issue));
	const own = { ...appearance.inherited, ...checked.appearance };
	const selection = pickSupportedAppearance(own, supported);
	const resolved = Object.keys(selection).length > 0 ? { ...parsed.data, appearance: selection } : parsed.data;

	const children = getElementChildren(parsed.data);
	if (!children) {
		return issues.length > 0 ? { issues } : { issues: [], item: resolved };
	}

	const nextChildren: FormTaggedConfig[] = [];
	const childScope = { axes: appearance.axes, inherited: own };
	for (let index = 0; index < children.length; index += 1) {
		const child = children[index];
		const nested = parseElementNode(
			child,
			getElement,
			hasValidation,
			childLocation(location, index, child),
			childScope,
		);
		issues.push(...nested.issues);
		if (nested.item) nextChildren.push(nested.item);
	}

	if (issues.length > 0) {
		return { issues };
	}

	return { issues: [], item: withElementChildren(resolved, nextChildren) };
}

function parseElementList(
	items: unknown[] | undefined,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	parentLocation: string,
	appearance: AppearanceScope,
): { issues: string[]; items?: FormTaggedConfig[] } {
	if (!items) return { issues: [] };

	const next: FormTaggedConfig[] = [];
	const issues: string[] = [];
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		const parsed = parseElementNode(
			item,
			getElement,
			hasValidation,
			childLocation(parentLocation, index, item),
			appearance,
		);
		issues.push(...parsed.issues);
		if (parsed.item) next.push(parsed.item);
	}
	return { issues, items: next };
}

function brandElementTree(
	config: FormTaggedConfig,
	getElement: ValidateFormOptions['getElement'],
): NormalizedElementConfig {
	const children = getElementChildren(config);
	const next = children
		? withElementChildren(
				config,
				children.map((child) => brandElementTree(child as FormTaggedConfig, getElement)),
			)
		: config;
	return markNormalizedElementConfig(next as unknown as ElementConfig, getElement(config.$type)?.containerKind);
}

/**
 * Validate a single element against its registration schema, including nested child elements.
 * Use this before rendering a field that is not already part of a {@link NormalizedFormConfig}.
 * The normalized marker is applied only after this element and its children succeed.
 */
export function validateElementConfig(
	config: unknown,
	options: Pick<ValidateFormOptions, 'getElement' | 'hasValidation' | 'appearance'>,
): NormalizedElementConfig {
	const parsed = parseElementNode(config, options.getElement, options.hasValidation, '', {
		axes: (options.appearance ?? getDefaultCompiledAppearance()).axes,
		inherited: {},
	});
	if (parsed.issues.length > 0 || !parsed.item) {
		const issues = parsed.issues.length ? parsed.issues : ['Invalid element configuration: missing $type.'];
		throw new FormValidationError(issues[0] ?? 'Invalid element configuration', issues);
	}
	return brandElementTree(parsed.item, options.getElement);
}

/**
 * Strict validation for a form configuration against the engine's registered recipes and schema.
 * Returns a frozen {@link NormalizedFormConfig}: schema defaults and transforms are kept, the input object is not mutated.
 */
export function validateFormConfig(config: unknown, options: ValidateFormOptions): NormalizedFormConfig {
	const existingOwner = getNormalizedFormOwner(config);
	if (existingOwner) {
		if (existingOwner === options.owner) {
			return config as NormalizedFormConfig;
		}
		const formId = typeof config === 'object' && config !== null && 'id' in config ? String(config.id) : 'unknown';
		const message = `Form '${formId}' was already normalized by a different engine. Pass the original authoring input or JSON to this engine instead.`;
		throw new FormValidationError(message, [message]);
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
	const parseActions = (
		items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
		parentLocation: string,
		itemKind: string,
	) =>
		parseTypedList(
			items,
			'action',
			options.getAction,
			'createFormEngine({ actions: [...] })',
			parentLocation,
			itemKind,
		);

	const { axes } = options.appearance ?? getDefaultCompiledAppearance();
	const formAppearance = checkAppearance(envelope.appearance, { axes, subject: 'The form' });
	issues.push(...formAppearance.issues.map((issue) => prefixed('form', issue)));

	const steps = envelope.steps.map((step, stepIndex) => {
		const stepLocation = itemLocation('steps', stepIndex, step);
		const stepAppearance = checkAppearance(step.appearance, { axes, subject: 'The step' });
		issues.push(...stepAppearance.issues.map((issue) => prefixed(stepLocation, issue)));
		const resolvedStepAppearance = { ...formAppearance.appearance, ...stepAppearance.appearance };
		const elements = parseElementList(step.elements, options.getElement, options.hasValidation, stepLocation, {
			axes,
			inherited: resolvedStepAppearance,
		});
		const actions = parseActions(step.actions, stepLocation, 'actions');
		issues.push(...elements.issues, ...actions.issues);
		const { appearance: _authored, ...rest } = step;
		return {
			...rest,
			...(Object.keys(resolvedStepAppearance).length > 0 && { appearance: resolvedStepAppearance }),
			elements: elements.items ?? step.elements,
			actions: actions.items ?? step.actions,
		};
	});

	const widthsConflict = columnsWithNamedWidths(envelope.grid, steps);
	if (widthsConflict) issues.push(widthsConflict);

	const view = parseView(
		envelope.view && typeof envelope.view.$type === 'string' ? envelope.view : undefined,
		{ id: envelope.id, stepCount: envelope.steps.length },
		options,
		{ axes, inherited: formAppearance.appearance },
	);
	const formActions = parseActions(envelope.actions, 'form', 'actions');
	issues.push(...view.issues, ...formActions.issues);

	if (issues.length > 0) {
		throw new FormValidationError(issues[0] ?? 'Invalid form configuration', issues);
	}

	const { appearance: _authoredForm, ...envelopeRest } = envelope;
	return markNormalizedFormConfig(
		{
			...envelopeRest,
			...(Object.keys(formAppearance.appearance).length > 0 && { appearance: formAppearance.appearance }),
			steps: steps.map((step) => ({
				...step,
				elements: step.elements.map((element) =>
					brandElementTree(element as FormTaggedConfig, options.getElement),
				),
			})),
			view: view.view ?? envelope.view,
			actions: formActions.items ?? envelope.actions,
		} as unknown as FormConfig,
		options.owner,
	);
}
