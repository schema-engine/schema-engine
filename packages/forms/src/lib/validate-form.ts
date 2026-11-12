import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import type { FormConfig, FormConfigEnvelope, FormTaggedConfig } from '@/schemas/form-config';
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
import { DEFAULT_WIZARD_RECIPE, stepGrid } from '@/lib/form-view';
import {
	areaNames,
	areaTemplateIssues,
	cascadeValues,
	elementAreaSlots,
	elementHiddenSlots,
	elementGridKeys,
	elementUsesGridWidths,
	GRID_TEMPLATE_KEYS,
	gridAreaTemplates,
	gridUsesAreas,
	namedPlacementOverflow,
	WIDTH_TRACKS,
	type CascadeSlot,
	type GridAreaTemplates,
	type CompiledAppearance,
	type GridLayoutConfig,
	getDefaultCompiledAppearance,
} from '@schema-engine/layout';
import { logger } from '@/lib/logger';
import { mergeSlotDefaults } from '@/recipes/merge-slot-defaults';
import { isPlainObject } from '@/lib/is-plain-object';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';

export type { FormConfigView, NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps, stepGrid } from '@/lib/form-view';

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
	/** Appearance axes the picks are checked against. Defaults to the built-in `size` and `surface` axes. */
	axes?: CompiledAppearance['axes'];
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
		const supported = recipe.appearanceAxes?.[slot] ?? [];
		const slotAppearance = resolveAppearance(
			isPlainObject(authoredSlot) ? authoredSlot.appearance : undefined,
			appearance,
			{ subject: `Slot '${slot}' of recipe '${recipe.$type}'`, location: `view.${slot}`, supported },
		);
		issues.push(...slotAppearance.issues);
		if (Object.keys(slotAppearance.selection).length > 0) resolved[slot] = slotAppearance.selection;
		if (isPlainObject(authoredSlot)) withoutAppearance[slot] = withAppearance(authoredSlot, {});
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
		if (isPlainObject(slotConfig)) next[slot] = { ...slotConfig, appearance: selection };
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

/** Placement keys that cannot sit beside a field's `area`, which is a placement of its own. */
const AREA_EXCLUSIVE_KEYS = ['width', 'offset', 'column', 'row'] as const;

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

/** The slot as it reads in a message: nothing for the default width, else ` at 'md'`. */
function atSlot(slot: CascadeSlot): string {
	return slot === 'default' ? '' : ` at '${slot}'`;
}

/**
 * Why a field's `area` cannot sit beside its other placement, or inside a container.
 *
 * @remarks
 * An area is a placement of its own: it resolves to the field's column and row,
 * so a width, offset or raw line set next to it would fight it. A container lays
 * its children out in a grid that takes no `areas`, so a child has no template
 * to name.
 */
function areaPlacementIssue(item: FormTaggedConfig, nested: boolean): string | undefined {
	const keys = elementGridKeys(item);
	if (!keys.has('area')) return undefined;
	const label = elementLabel(item);
	if (nested) {
		return `${label} sets grid 'area' inside a container; a container lays its children out without areas.`;
	}
	const others = AREA_EXCLUSIVE_KEYS.filter((key) => keys.has(key));
	if (others.length === 0) return undefined;
	return `${label} sets grid ${quotedKeys(['area', ...others])}; use an area or a width, offset or raw line, not both.`;
}

interface GridScope {
	/** Where the step sits in the form, prefixed to every issue that names its fields. */
	location: string;
	elements: readonly FormTaggedConfig[];
}

/** The grid keys that set its own tracks (`columns`, `minColumnWidth`), at any breakpoint. */
function templateTrackKeys(grid: GridLayoutConfig | undefined): string[] {
	const entries = [grid, ...Object.values(grid?.responsive ?? {})];
	return GRID_TEMPLATE_KEYS.filter((key) => entries.some((entry) => entry?.[key] !== undefined));
}

/**
 * Why a grid's `areas` cannot be a template: it sets `columns` or
 * `minColumnWidth` beside them, a responsive record has no `default`, or a
 * template has rows of unequal length or a non-rectangular area.
 *
 * @remarks
 * Nothing here depends on the fields, so a grid shared by several steps is
 * checked once rather than once per step.
 */
function templateIssues(label: string, grid: GridLayoutConfig | undefined): string[] {
	if (!gridUsesAreas(grid)) return [];
	const templates = gridAreaTemplates(grid);
	const issues: string[] = [];
	const tracks = templateTrackKeys(grid);
	if (tracks.length > 0) {
		issues.push(`${label} sets ${quotedKeys(['areas', ...tracks])}; a grid uses areas, widths or columns.`);
	}
	if (templates.default === undefined) {
		issues.push(
			`${label} 'areas' per breakpoint must include 'default', the layout below the narrowest breakpoint.`,
		);
	}
	for (const { slot, message } of areaTemplateIssues(templates)) {
		issues.push(`${label} areas${atSlot(slot)}: ${message}`);
	}
	return issues;
}

/**
 * Why a step's fields do not fit the grid that lays them out.
 *
 * @remarks
 * Fields are checked against the cascade the stylesheet applies: a field's area
 * at a breakpoint is the last one set at or below it, and so is the template.
 * That is what a viewport gets, and it catches a template that changes at `md`
 * under a field that kept its `default` area.
 */
function fieldPlacementIssues(
	label: string,
	grid: GridLayoutConfig | undefined,
	scope: GridScope,
	templatesValid: boolean,
	sharedBySteps: boolean,
): string[] {
	const usesAreas = gridUsesAreas(grid);
	const issues: string[] = [];

	const widths = scope.elements.find(elementUsesGridWidths);
	const exclusive = usesAreas ? ['areas'] : templateTrackKeys(grid);
	if (widths && exclusive.length > 0) {
		issues.push(
			`${label} sets ${quotedKeys(exclusive)} but ${elementLabel(widths)} uses 'width' or 'offset'; a grid uses areas, widths or columns.`,
		);
	}

	const claimants = scope.elements.filter((element) => Object.keys(elementAreaSlots(element)).length > 0);
	if (!usesAreas) {
		for (const element of claimants) {
			issues.push(`${elementLabel(element)} sets grid 'area' but the ${label.toLowerCase()} has no 'areas'.`);
		}
	} else if (templatesValid) {
		issues.push(...areaClaimIssues(label, gridAreaTemplates(grid), claimants, sharedBySteps));
	}
	return issues.map((issue) => prefixed(scope.location, issue));
}

function areaClaimIssues(
	label: string,
	templates: GridAreaTemplates,
	claimants: readonly FormTaggedConfig[],
	sharedBySteps: boolean,
): string[] {
	const issues: string[] = [];
	const templateBySlot = cascadeValues(templates);
	const claims = claimants.map((element) => ({
		element,
		bySlot: cascadeValues(elementAreaSlots(element)),
		hiddenBySlot: cascadeValues(elementHiddenSlots(element)),
	}));

	for (const { element, bySlot, hiddenBySlot } of claims) {
		for (const [index, { slot, value: area }] of bySlot.entries()) {
			const rows = templateBySlot[index]?.value;
			if (area === undefined || rows === undefined || hiddenBySlot[index]?.value) continue;
			const names = areaNames(rows);
			if (names.includes(area)) continue;
			issues.push(
				`${elementLabel(element)} claims area '${area}'${atSlot(slot)}, which is not in the grid areas (${names.join(', ')}).`,
			);
			break;
		}
	}

	const hint = sharedBySteps ? '; a form template applies to every step without a grid of its own' : '';
	const reported = new Set<string>();
	for (const [index, { slot, value: rows }] of templateBySlot.entries()) {
		if (rows === undefined) continue;
		for (const name of areaNames(rows)) {
			const claimed = claims.some(({ bySlot }) => bySlot[index]?.value === name);
			if (claimed || reported.has(name)) continue;
			reported.add(name);
			issues.push(`${label} area '${name}'${atSlot(slot)} is not claimed by any field${hint}.`);
		}
	}
	return issues;
}

function parseElementNode(
	item: unknown,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	location: string,
	appearance: AppearanceScope,
	nested = false,
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
	const areaIssue = areaPlacementIssue(parsed.data, nested);
	if (areaIssue) return fail(areaIssue);

	const elementAppearance = resolveAppearance(authoredAppearance, appearance, {
		subject: `Element '${item.$type}'`,
		location,
		supported: getElement(item.$type)?.appearanceAxes ?? [],
	});
	const issues = elementAppearance.issues;
	const resolved = withAppearance(parsed.data, elementAppearance.selection);

	const children = getElementChildren(parsed.data);
	if (!children) {
		return issues.length > 0 ? { issues } : { issues: [], item: resolved };
	}

	const nextChildren: FormTaggedConfig[] = [];
	const childScope = elementAppearance.childScope;
	for (let index = 0; index < children.length; index += 1) {
		const child = children[index];
		const parsedChild = parseElementNode(
			child,
			getElement,
			hasValidation,
			childLocation(location, index, child),
			childScope,
			true,
		);
		issues.push(...parsedChild.issues);
		if (parsedChild.item) nextChildren.push(parsedChild.item);
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
	options: Pick<ValidateFormOptions, 'getElement' | 'hasValidation' | 'axes'>,
): NormalizedElementConfig {
	const parsed = parseElementNode(config, options.getElement, options.hasValidation, '', {
		axes: options.axes ?? getDefaultCompiledAppearance().axes,
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

	const axes = options.axes ?? getDefaultCompiledAppearance().axes;
	const formScope: AppearanceScope = { axes, inherited: {} };
	const formAppearance = resolveAppearance(envelope.appearance, formScope, { subject: 'The form', location: 'form' });
	issues.push(...formAppearance.issues);

	const steps = envelope.steps.map((step, stepIndex) => {
		const stepLocation = itemLocation('steps', stepIndex, step);
		const stepAppearance = resolveAppearance(step.appearance, formAppearance.childScope, {
			subject: 'The step',
			location: stepLocation,
		});
		issues.push(...stepAppearance.issues);
		const elements = parseElementList(
			step.elements,
			options.getElement,
			options.hasValidation,
			stepLocation,
			stepAppearance.childScope,
		);
		const actions = parseActions(step.actions, stepLocation, 'actions');
		issues.push(...elements.issues, ...actions.issues);
		return {
			...withAppearance(step, stepAppearance.selection),
			elements: elements.items ?? step.elements,
			actions: actions.items ?? step.actions,
		};
	});

	const formShape = templateIssues('Form grid', envelope.grid);
	issues.push(...formShape);
	steps.forEach((step, index) => {
		const own = step.grid !== undefined;
		const label = own ? 'Step grid' : 'Form grid';
		const shape = own ? templateIssues(label, step.grid) : formShape;
		if (own) issues.push(...shape);
		const scope = { location: itemLocation('steps', index, step), elements: step.elements };
		issues.push(...fieldPlacementIssues(label, stepGrid(envelope, step), scope, shape.length === 0, !own));
	});

	const view = parseView(
		envelope.view && typeof envelope.view.$type === 'string' ? envelope.view : undefined,
		{ id: envelope.id, stepCount: envelope.steps.length },
		options,
		formAppearance.childScope,
	);
	const formActions = parseActions(envelope.actions, 'form', 'actions');
	issues.push(...view.issues, ...formActions.issues);

	if (issues.length > 0) {
		throw new FormValidationError(issues[0] ?? 'Invalid form configuration', issues);
	}

	return markNormalizedFormConfig(
		{
			...withAppearance(envelope, formAppearance.selection),
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
