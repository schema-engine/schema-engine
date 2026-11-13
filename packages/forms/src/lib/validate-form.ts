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
import { ELEMENT_CHILDREN_KEY, getElementChildren, withElementChildren } from '@/lib/element-children';
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
	type GridLayoutConfig,
	resolveRecipeView,
	getDefaultLayoutTheme,
	type LayoutTheme,
} from '@schema-engine/layout';
import { logger } from '@/lib/logger';
import { resolveAppearance, withAppearance, type AppearanceScope } from '@/lib/resolve-appearance';

export type { FormConfigView, NormalizedElementConfig, NormalizedFormConfig } from '@/lib/normalized-form-config';
export { DEFAULT_WIZARD_RECIPE, assertFormEngine, getRenderableSteps, stepGrid } from '@/lib/form-view';

/**
 * One problem found while validating a form, shaped like a Standard Schema issue.
 *
 * @remarks
 * `path` names the config key the issue is about, in object keys and array indexes, for example
 * `['steps', 0, 'elements', 2, 'grid', 'width']`. An issue about the whole form has the path `[]`.
 * A path is always plain keys, so a `PathSegment` from a schema issue is flattened to its key.
 */
export interface FormValidationIssue {
	readonly message: string;
	readonly path: ReadonlyArray<PropertyKey>;
}

/** What {@link safeValidateFormConfig} returns: the normalized form, or the issues found. */
export type FormValidationResult<T> = { success: true; data: T } | { success: false; issues: FormValidationIssue[] };

type Path = ReadonlyArray<PropertyKey>;

function childOf(node: unknown, key: PropertyKey): unknown {
	return typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined;
}

/**
 * A path as it reads in an error message: object keys joined by dots, array indexes in brackets,
 * for example `steps[0].elements[2].grid.width`. The empty path is the empty string.
 *
 * @param source The config the path points into. With it, an array item that has a string `id` is
 * followed by the id in parentheses, `steps[0] (main).elements[2] (email).grid.width`, so a log of a
 * config with many fields names the one it means.
 */
export function formatIssuePath(path: Path, source?: unknown): string {
	let node = source;
	let text = '';
	for (const key of path) {
		node = childOf(node, key);
		if (typeof key === 'number') {
			const id = childOf(node, 'id');
			text += typeof id === 'string' && id ? `[${key}] (${id})` : `[${key}]`;
		} else {
			text += text ? `.${String(key)}` : String(key);
		}
	}
	return text;
}

/**
 * Thrown by {@link validateFormConfig} when a form does not validate.
 *
 * @param issues Every problem the checks found, each with the config path it is about.
 * @param source The authored config the paths point into. It only decorates `message` with the ids
 * of the elements and actions a path passes; `issues` stay as they are.
 *
 * @remarks
 * `message` lists the issues one per line as `<path>: <message>`, so a log reads without parsing
 * `issues`. Use `safeValidateForm` on the engine to get the same issues as a result instead of an
 * exception.
 */
export class FormValidationError extends Error {
	readonly issues: readonly FormValidationIssue[];

	constructor(issues: readonly FormValidationIssue[], source?: unknown) {
		super(
			issues.length > 0
				? issues
						.map((issue) => {
							const path = formatIssuePath(issue.path, source);
							return path ? `${path}: ${issue.message}` : issue.message;
						})
						.join('\n')
				: 'Invalid form configuration',
		);
		this.name = 'FormValidationError';
		this.issues = issues;
	}
}

function issueAt(path: Path, message: string): FormValidationIssue {
	return { path, message };
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
	/** Appearance axes the picks are checked against. Defaults to the built-in `size` and `surface` axes. */
	axes?: LayoutTheme['axes'];
}

function schemaIssuePath(path: StandardSchemaIssue['path']): PropertyKey[] {
	return (path ?? []).map((segment) =>
		typeof segment === 'object' && segment !== null && 'key' in segment ? segment.key : segment,
	);
}

/** The message a schema library falls back to when it has no locale loaded, such as `zod/mini`. */
const GENERIC_SCHEMA_MESSAGE = 'Invalid input';

interface SchemaIssueDetails {
	code?: unknown;
	values?: unknown;
	expected?: unknown;
	origin?: unknown;
	minimum?: unknown;
	maximum?: unknown;
	inclusive?: unknown;
	format?: unknown;
	pattern?: unknown;
	keys?: unknown;
}

function issueKeys(details: SchemaIssueDetails): PropertyKey[] {
	return Array.isArray(details.keys)
		? details.keys.filter(
				(key): key is PropertyKey =>
					typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol',
			)
		: [];
}

/** A bound as a sentence: `at least 3 characters`, `less than 10`. */
function describeBound(details: SchemaIssueDetails, side: 'min' | 'max'): string | undefined {
	const bound = side === 'min' ? details.minimum : details.maximum;
	if (typeof bound !== 'number' && typeof bound !== 'bigint') return undefined;
	const exclusive = details.inclusive === false;
	const comparison = side === 'min' ? (exclusive ? 'greater than' : 'at least') : exclusive ? 'less than' : 'at most';
	const noun =
		details.origin === 'string'
			? 'character'
			: details.origin === 'array' || details.origin === 'set'
				? 'item'
				: '';
	const unit = noun ? ` ${noun}${bound === 1 || bound === 1n ? '' : 's'}` : '';
	return `${comparison} ${bound}${unit}`;
}

/**
 * What a schema issue says. A message the schema or its author wrote is kept as is; the bare
 * fallback is replaced by what the issue itself reports (the allowed values, the expected type, a
 * bound, a format).
 *
 * @remarks
 * `zod/mini` loads no locale, so its own issues all read `Invalid input`; the `code` and its details
 * carry what a reader needs. These are author diagnostics, not copy rendered to a form's users. A
 * host that loads a locale (`z.config(z.locales.en())`) gets that locale's messages untouched. A
 * schema that reports offending `keys` without a known code keeps them listed after its message.
 */
function describeSchemaIssue(issue: StandardSchemaIssue, details: SchemaIssueDetails): string {
	if (issue.message === GENERIC_SCHEMA_MESSAGE) {
		if (details.code === 'invalid_value' && Array.isArray(details.values)) {
			return `Expected one of ${details.values.map(String).join(', ')}.`;
		}
		if (details.code === 'invalid_type' && typeof details.expected === 'string') {
			return `Expected ${details.expected}.`;
		}
		const bound =
			details.code === 'too_small'
				? describeBound(details, 'min')
				: details.code === 'too_big'
					? describeBound(details, 'max')
					: undefined;
		if (bound) return `Must be ${bound}.`;
		if (details.code === 'invalid_format' && typeof details.format === 'string') {
			return details.format === 'regex' && typeof details.pattern === 'string'
				? `Must match the pattern ${details.pattern}.`
				: `Invalid ${details.format} format.`;
		}
	}
	const keys = issueKeys(details);
	return keys.length > 0 ? `${issue.message} (${keys.map(String).join(', ')})` : issue.message;
}

/**
 * Schema issues as form issues, each path laid under `base`, the location of the thing that was validated.
 *
 * @remarks
 * An `unrecognized_keys` issue names the object, so it becomes one issue per key, at the key itself. A
 * locale's message that names a single key is kept; one that names several is replaced per key.
 * That is where an editor or a YAML file should point, and where the engine's own check of a view's
 * unknown keys already points.
 */
function fromSchemaIssues(issues: readonly StandardSchemaIssue[], base: Path): FormValidationIssue[] {
	if (issues.length === 0) return [issueAt(base, 'Validation failed')];
	return issues.flatMap((issue) => {
		const details = issue as StandardSchemaIssue & SchemaIssueDetails;
		const path = [...base, ...schemaIssuePath(issue.path)];
		const keys = issueKeys(details);
		if (details.code === 'unrecognized_keys' && keys.length > 0) {
			return keys.map((key) =>
				issueAt(
					[...path, key],
					issue.message === GENERIC_SCHEMA_MESSAGE || keys.length > 1
						? `Unrecognized key: ${String(key)}.`
						: issue.message,
				),
			);
		}
		return [issueAt(path, describeSchemaIssue(issue, details))];
	});
}

function childPath(parent: Path, index: number): Path {
	return [...parent, ELEMENT_CHILDREN_KEY, index];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Where a grid sets the first of `keys`, relative to the grid: `['columns']` or
 * `['responsive', 'md', 'columns']`. With `slot`, only that slot's entry is read.
 *
 * @remarks
 * A path always names a key the author wrote, never a viewport the cascade resolved to, so an editor
 * or a YAML file lands on real text.
 */
function gridKeyPath(grid: unknown, keys: readonly string[], slot?: CascadeSlot): Path | undefined {
	if (!isRecord(grid)) return undefined;
	const entries: Array<{ slot: string; prefix: Path; entry: unknown }> = [
		{ slot: 'default', prefix: [], entry: grid },
	];
	if (isRecord(grid.responsive)) {
		for (const [name, entry] of Object.entries(grid.responsive)) {
			entries.push({ slot: name, prefix: ['responsive', name], entry });
		}
	}
	for (const { slot: entrySlot, prefix, entry } of entries) {
		if ((slot !== undefined && entrySlot !== slot) || !isRecord(entry)) continue;
		const key = keys.find((name) => entry[name] !== undefined);
		if (key !== undefined) return [...prefix, key];
	}
	return undefined;
}

/** Where an element sets the first of `keys` in its `grid`, relative to the element; `['grid']` when none is set. */
function elementGridKeyPath(item: FormTaggedConfig, keys: readonly string[], slot?: CascadeSlot): Path {
	const path = gridKeyPath(item.grid, keys, slot);
	return path ? ['grid', ...path] : ['grid'];
}

/** Where a grid's `areas` template for a slot sits, below the grid. An array is the `default` template itself. */
function areasPath(grid: GridLayoutConfig | undefined, slot: CascadeSlot): Path {
	return Array.isArray(grid?.areas) ? ['areas'] : ['areas', slot];
}

const ACTION_REGISTER_HINT = 'createFormEngine({ actions: [...] })';

type ParseResult<T> = { ok: true; data: T } | { ok: false; issues: FormValidationIssue[] };

function isTaggedConfig(value: unknown): value is FormTaggedConfig {
	return typeof value === 'object' && value !== null && '$type' in value && typeof value.$type === 'string';
}

function parseRegistration(schema: StandardSchemaV1, config: object, path: Path): ParseResult<unknown> {
	const result = safeParseStandardSchema(schema, config);
	if (!result.success) {
		return { ok: false, issues: fromSchemaIssues(result.error.issues, path) };
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
): { issues: FormValidationIssue[]; view?: FormTaggedConfig } {
	const { getRecipe } = options;
	const stepCount = form.stepCount;
	let view = authored;
	if (!view) {
		if (stepCount === 0) return { issues: [issueAt(['steps'], 'Form must have at least one step.')] };
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
		return { issues: [issueAt(['view', '$type'], 'Must be a non-empty string.')] };
	}

	const recipe = getRecipe(recipeType);
	if (!recipe) {
		return {
			issues: [
				issueAt(
					['view', '$type'],
					`Unknown view recipe '${recipeType}'. Register it with createFormEngine({ recipes: [...] }).`,
				),
			],
		};
	}

	const issues: FormValidationIssue[] = [];
	if (recipe.kind === 'single-step' && stepCount !== 1) {
		issues.push(
			issueAt(
				['view', '$type'],
				`Recipe '${recipeType}' is single-step only (kind: 'single-step') but the form has ${stepCount} steps.`,
			),
		);
	}
	if (recipe.kind === 'wizard' && stepCount < 2) {
		issues.push(
			issueAt(
				['view', '$type'],
				`Recipe '${recipeType}' requires at least 2 steps (kind: 'wizard') but the form has ${stepCount} step(s).`,
			),
		);
	}

	const resolved = resolveRecipeView(recipe, view, appearance);
	issues.push(...resolved.issues.map((issue) => issueAt(['view', ...issue.path], issue.message)));
	if (resolved.schemaIssues) {
		issues.push(...fromSchemaIssues(resolved.schemaIssues, ['view']));
	}
	return { issues, view: isTaggedConfig(resolved.view) ? resolved.view : view };
}

function parseTypedConfig(
	kind: 'element' | 'action',
	item: FormTaggedConfig,
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
	path: Path,
): ParseResult<FormTaggedConfig> {
	const registration = getRegistration(item.$type);
	if (!registration) {
		return {
			ok: false,
			issues: [
				issueAt([...path, '$type'], `Unknown ${kind} type '${item.$type}'. Register it with ${registerHint}.`),
			],
		};
	}

	const parsed = parseRegistration(registration.schema, item, path);
	if (!parsed.ok) return parsed;
	if (!isTaggedConfig(parsed.data)) {
		return {
			ok: false,
			issues: [
				issueAt(
					[...path, '$type'],
					`Invalid ${kind} configuration for '${item.$type}': parsed output is missing $type.`,
				),
			],
		};
	}
	return { ok: true, data: parsed.data };
}

/**
 * Validates the `actions` of the form or of a step. A nested array is a group of actions that
 * render together; its members sit one level deeper in the path.
 */
function parseActionList(
	items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
	getRegistration: (id: string) => { schema: StandardSchemaV1 } | undefined,
	registerHint: string,
	ownerPath: Path,
): { issues: FormValidationIssue[]; items?: Array<FormTaggedConfig | FormTaggedConfig[]> } {
	if (!items) return { issues: [] };

	const next: Array<FormTaggedConfig | FormTaggedConfig[]> = [];
	const issues: FormValidationIssue[] = [];
	const parseItem = (item: FormTaggedConfig, path: Path): FormTaggedConfig | undefined => {
		const result = parseTypedConfig('action', item, getRegistration, registerHint, path);
		if (!result.ok) {
			issues.push(...result.issues);
			return undefined;
		}
		return result.data;
	};
	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		if (Array.isArray(item)) {
			const group = item
				.map((action, actionIndex) => parseItem(action, [...ownerPath, 'actions', index, actionIndex]))
				.filter((action): action is FormTaggedConfig => action !== undefined);
			next.push(group);
			continue;
		}
		const parsed = parseItem(item, [...ownerPath, 'actions', index]);
		if (parsed) next.push(parsed);
	}

	return { issues, items: next };
}

/** The first rule of an element with a `type` no validation handler is registered for. */
function unregisteredValidationRule(
	item: FormTaggedConfig,
	hasValidation: ValidateFormOptions['hasValidation'],
): { index: number; message: string } | undefined {
	if (!Array.isArray(item.rules)) return undefined;

	for (const [index, rule] of item.rules.entries()) {
		if (typeof rule !== 'object' || rule === null || !('type' in rule) || typeof rule.type !== 'string') {
			continue;
		}
		if (!hasValidation(rule.type)) {
			const fieldName = typeof item.name === 'string' ? `Field '${item.name}'` : 'Element';
			return { index, message: `${fieldName} uses validation rule '${rule.type}' with no registered handler.` };
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
 * The path is relative to the element and names the key that conflicts, or the one that overflows.
 */
function namedPlacementIssue(item: FormTaggedConfig): FormValidationIssue | undefined {
	const keys = elementGridKeys(item);
	const named = ['width', 'offset'].filter((key) => keys.has(key));
	if (named.length === 0) return undefined;
	const label = elementLabel(item);
	if (keys.has('column')) {
		return issueAt(
			elementGridKeyPath(item, ['column']),
			`${label} sets grid ${quotedKeys(named)} and 'column'; use named widths or a raw column, not both.`,
		);
	}
	const overflow = namedPlacementOverflow(item);
	if (overflow) {
		return issueAt(
			elementGridKeyPath(item, ['width', 'offset'], overflow.slot),
			`${label} sets grid 'width' and 'offset' that span ${overflow.tracks} of ${WIDTH_TRACKS} tracks at ${overflow.slot === 'default' ? 'default' : `'${overflow.slot}'`}; together they must fit in ${WIDTH_TRACKS} tracks.`,
		);
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
 * to name. The path is relative to the element.
 */
function areaPlacementIssue(item: FormTaggedConfig, nested: boolean): FormValidationIssue | undefined {
	const keys = elementGridKeys(item);
	if (!keys.has('area')) return undefined;
	const label = elementLabel(item);
	if (nested) {
		return issueAt(
			elementGridKeyPath(item, ['area']),
			`${label} sets grid 'area' inside a container; a container lays its children out without areas.`,
		);
	}
	const others = AREA_EXCLUSIVE_KEYS.filter((key) => keys.has(key));
	if (others.length === 0) return undefined;
	return issueAt(
		elementGridKeyPath(item, others),
		`${label} sets grid ${quotedKeys(['area', ...others])}; use an area or a width, offset or raw line, not both.`,
	);
}

/** An element of a step that validated, with where it sits in the form. */
interface PlacedElement {
	element: FormTaggedConfig;
	path: Path;
}

interface GridScope {
	/** Where the grid that lays the step out sits: the step's own, else the form's. */
	gridPath: Path;
	elements: readonly PlacedElement[];
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
 * @param gridPath Where the grid sits in the form, prefixed to each issue.
 *
 * @remarks
 * Nothing here depends on the fields, so a grid shared by several steps is
 * checked once rather than once per step.
 */
function templateIssues(label: string, grid: GridLayoutConfig | undefined, gridPath: Path): FormValidationIssue[] {
	if (!gridUsesAreas(grid)) return [];
	const templates = gridAreaTemplates(grid);
	const issues: FormValidationIssue[] = [];
	const tracks = templateTrackKeys(grid);
	if (tracks.length > 0) {
		issues.push(
			issueAt(
				[...gridPath, 'areas'],
				`${label} sets ${quotedKeys(['areas', ...tracks])}; a grid uses areas, widths or columns.`,
			),
		);
	}
	if (templates.default === undefined) {
		issues.push(
			issueAt(
				[...gridPath, 'areas'],
				`${label} 'areas' per breakpoint must include 'default', the layout below the narrowest breakpoint.`,
			),
		);
	}
	for (const { slot, message } of areaTemplateIssues(templates)) {
		issues.push(issueAt([...gridPath, ...areasPath(grid, slot)], `${label} areas${atSlot(slot)}: ${message}`));
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
): FormValidationIssue[] {
	const usesAreas = gridUsesAreas(grid);
	const issues: FormValidationIssue[] = [];

	const widths = scope.elements.find(({ element }) => elementUsesGridWidths(element));
	const exclusive = usesAreas ? ['areas'] : templateTrackKeys(grid);
	if (widths && exclusive.length > 0) {
		const tracksPath = gridKeyPath(grid, GRID_TEMPLATE_KEYS) ?? [];
		issues.push(
			issueAt(
				[...scope.gridPath, ...(usesAreas ? ['areas'] : tracksPath)],
				`${label} sets ${quotedKeys(exclusive)} but ${elementLabel(widths.element)} uses 'width' or 'offset'; a grid uses areas, widths or columns.`,
			),
		);
	}

	const claimants = scope.elements.filter(({ element }) => Object.keys(elementAreaSlots(element)).length > 0);
	if (!usesAreas) {
		for (const { element, path } of claimants) {
			issues.push(
				issueAt(
					[...path, ...elementGridKeyPath(element, ['area'])],
					`${elementLabel(element)} sets grid 'area' but the ${label.toLowerCase()} has no 'areas'.`,
				),
			);
		}
	} else if (templatesValid) {
		issues.push(...areaClaimIssues(label, grid, scope.gridPath, claimants, sharedBySteps));
	}
	return issues;
}

function areaClaimIssues(
	label: string,
	grid: GridLayoutConfig | undefined,
	gridPath: Path,
	claimants: readonly PlacedElement[],
	sharedBySteps: boolean,
): FormValidationIssue[] {
	const issues: FormValidationIssue[] = [];
	const templates = gridAreaTemplates(grid);
	const templateBySlot = cascadeValues(templates);
	const claims = claimants.map(({ element, path }) => ({
		element,
		path,
		authored: elementAreaSlots(element),
		bySlot: cascadeValues(elementAreaSlots(element)),
		hiddenBySlot: cascadeValues(elementHiddenSlots(element)),
	}));

	for (const { element, path, authored, bySlot, hiddenBySlot } of claims) {
		for (const [index, { slot, value: area }] of bySlot.entries()) {
			const rows = templateBySlot[index]?.value;
			if (area === undefined || rows === undefined || hiddenBySlot[index]?.value) continue;
			const names = areaNames(rows);
			if (names.includes(area)) continue;
			issues.push(
				issueAt(
					[...path, ...elementGridKeyPath(element, ['area'], authoredSlot(authored, slot))],
					`${elementLabel(element)} claims area '${area}'${atSlot(slot)}, which is not in the grid areas (${names.join(', ')}).`,
				),
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
			issues.push(
				issueAt(
					[...gridPath, ...areasPath(grid, authoredSlot(templates, slot))],
					`${label} area '${name}'${atSlot(slot)} is not claimed by any field${hint}.`,
				),
			);
		}
	}
	return issues;
}

/**
 * The slot whose authored entry a cascaded slot resolves to: itself when it sets one, else the last
 * narrower slot that did. A message says where a viewport lands; a path says what the author wrote.
 */
function authoredSlot<T>(authored: Partial<Record<CascadeSlot, T>>, slot: CascadeSlot): CascadeSlot {
	let found: CascadeSlot = 'default';
	for (const { slot: candidate } of cascadeValues(authored)) {
		if (authored[candidate] !== undefined) found = candidate;
		if (candidate === slot) break;
	}
	return found;
}

function parseElementNode(
	item: unknown,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	path: Path,
	appearance: AppearanceScope,
	nested = false,
): { issues: FormValidationIssue[]; item?: FormTaggedConfig } {
	const fail = (message: string, relative: Path = []) => ({ issues: [issueAt([...path, ...relative], message)] });

	if (!isTaggedConfig(item)) {
		return fail('Invalid element configuration: missing $type.', ['$type']);
	}
	const unregisteredRule = unregisteredValidationRule(item, hasValidation);
	if (unregisteredRule) return fail(unregisteredRule.message, ['rules', unregisteredRule.index, 'type']);

	const { appearance: authoredAppearance, ...authored } = item;
	const parsed = parseTypedConfig(
		'element',
		authored as FormTaggedConfig,
		getElement,
		'createFormEngine({ elements: [...] })',
		path,
	);
	if (!parsed.ok) {
		return { issues: parsed.issues };
	}
	const placementIssue = namedPlacementIssue(parsed.data);
	if (placementIssue) return fail(placementIssue.message, placementIssue.path);
	const areaIssue = areaPlacementIssue(parsed.data, nested);
	if (areaIssue) return fail(areaIssue.message, areaIssue.path);

	const elementAppearance = resolveAppearance(authoredAppearance, appearance, {
		subject: `Element '${item.$type}'`,
		path,
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
		const parsedChild = parseElementNode(
			children[index],
			getElement,
			hasValidation,
			childPath(path, index),
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

/**
 * Validates the elements of a step. `byIndex` keeps each element at the index it was authored at
 * (`undefined` where it failed), so later checks name the right path.
 */
function parseElementList(
	items: unknown[] | undefined,
	getElement: ValidateFormOptions['getElement'],
	hasValidation: ValidateFormOptions['hasValidation'],
	parentPath: Path,
	appearance: AppearanceScope,
): { issues: FormValidationIssue[]; items?: FormTaggedConfig[]; byIndex: Array<FormTaggedConfig | undefined> } {
	if (!items) return { issues: [], byIndex: [] };

	const next: FormTaggedConfig[] = [];
	const byIndex: Array<FormTaggedConfig | undefined> = [];
	const issues: FormValidationIssue[] = [];
	for (let index = 0; index < items.length; index += 1) {
		const parsed = parseElementNode(
			items[index],
			getElement,
			hasValidation,
			childPath(parentPath, index),
			appearance,
		);
		issues.push(...parsed.issues);
		byIndex.push(parsed.item);
		if (parsed.item) next.push(parsed.item);
	}
	return { issues, items: next, byIndex };
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
 *
 * @throws {FormValidationError} Issue paths are relative to the element, for example `['grid', 'width']`
 * or `['elements', 0, 'rules', 1, 'type']`.
 */
export function validateElementConfig(
	config: unknown,
	options: Pick<ValidateFormOptions, 'getElement' | 'hasValidation' | 'axes'>,
): NormalizedElementConfig {
	const parsed = parseElementNode(config, options.getElement, options.hasValidation, [], {
		axes: options.axes ?? getDefaultLayoutTheme().axes,
		inherited: {},
	});
	if (parsed.issues.length > 0 || !parsed.item) {
		throw new FormValidationError(
			parsed.issues.length > 0
				? parsed.issues
				: [issueAt(['$type'], 'Invalid element configuration: missing $type.')],
			config,
		);
	}
	return brandElementTree(parsed.item, options.getElement);
}

/**
 * Strict validation for a form configuration against the engine's registered recipes and schema.
 * Returns a frozen {@link NormalizedFormConfig}: schema defaults and transforms are kept, the input object is not mutated.
 *
 * @throws {FormValidationError} With the issues found. {@link safeValidateFormConfig} returns them instead.
 */
export function validateFormConfig(config: unknown, options: ValidateFormOptions): NormalizedFormConfig {
	const result = safeValidateFormConfig(config, options);
	if (!result.success) throw new FormValidationError(result.issues, config);
	return result.data;
}

/**
 * Same validation as {@link validateFormConfig}, reported as a result: the normalized form, or the
 * issues found, each with the config path it is about.
 *
 * @remarks
 * A malformed envelope (the form's own shape) stops the deeper checks, so it comes back on its own;
 * once the envelope parses, the issues of every element, action, grid and view are reported together.
 * Still throws for a misuse of the API, such as a registration whose Standard Schema is async.
 */
export function safeValidateFormConfig(
	config: unknown,
	options: ValidateFormOptions,
): FormValidationResult<NormalizedFormConfig> {
	const existingOwner = getNormalizedFormOwner(config);
	if (existingOwner) {
		if (existingOwner === options.owner) {
			return { success: true, data: config as NormalizedFormConfig };
		}
		const formId = typeof config === 'object' && config !== null && 'id' in config ? String(config.id) : 'unknown';
		return {
			success: false,
			issues: [
				issueAt(
					[],
					`Form '${formId}' was already normalized by a different engine. Pass the original authoring input or JSON to this engine instead.`,
				),
			],
		};
	}

	const parsedEnvelope = parseEnvelope(config);
	if (!parsedEnvelope.ok) return { success: false, issues: parsedEnvelope.issues };
	const envelope = parsedEnvelope.data;

	const issues: FormValidationIssue[] = [];
	const axes = options.axes ?? getDefaultLayoutTheme().axes;
	const formScope: AppearanceScope = { axes, inherited: {} };
	const formAppearance = resolveAppearance(envelope.appearance, formScope, { subject: 'The form', path: [] });
	issues.push(...formAppearance.issues);

	const placed: PlacedElement[][] = [];
	const steps = envelope.steps.map((step, stepIndex) => {
		const stepPath: Path = ['steps', stepIndex];
		const stepAppearance = resolveAppearance(step.appearance, formAppearance.childScope, {
			subject: 'The step',
			path: stepPath,
		});
		issues.push(...stepAppearance.issues);
		const elements = parseElementList(
			step.elements,
			options.getElement,
			options.hasValidation,
			stepPath,
			stepAppearance.childScope,
		);
		const actions = parseActionList(step.actions, options.getAction, ACTION_REGISTER_HINT, stepPath);
		issues.push(...elements.issues, ...actions.issues);
		placed.push(
			elements.byIndex.flatMap((element, index) =>
				element ? [{ element, path: childPath(stepPath, index) }] : [],
			),
		);
		return {
			...withAppearance(step, stepAppearance.selection),
			elements: elements.items ?? step.elements,
			actions: actions.items ?? step.actions,
		};
	});

	const formShape = templateIssues('Form grid', envelope.grid, ['grid']);
	issues.push(...formShape);
	steps.forEach((step, index) => {
		const own = step.grid !== undefined;
		const label = own ? 'Step grid' : 'Form grid';
		const gridPath: Path = own ? ['steps', index, 'grid'] : ['grid'];
		const shape = own ? templateIssues(label, step.grid, gridPath) : formShape;
		if (own) issues.push(...shape);
		const scope = { gridPath, elements: placed[index] ?? [] };
		issues.push(...fieldPlacementIssues(label, stepGrid(envelope, step), scope, shape.length === 0, !own));
	});

	const view = parseView(
		envelope.view && typeof envelope.view.$type === 'string' ? envelope.view : undefined,
		{ id: envelope.id, stepCount: envelope.steps.length },
		options,
		formAppearance.childScope,
	);
	const formActions = parseActionList(envelope.actions, options.getAction, ACTION_REGISTER_HINT, []);
	issues.push(...view.issues, ...formActions.issues);

	if (issues.length > 0) {
		return { success: false, issues };
	}

	return {
		success: true,
		data: markNormalizedFormConfig(
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
		),
	};
}

/**
 * Parses the form's own shape (its id, steps, view and the like). Nothing deeper is checked when this
 * fails, so a malformed envelope is reported on its own.
 */
function parseEnvelope(config: unknown): ParseResult<FormConfigEnvelope> {
	const result = safeParseStandardSchema(formConfigEnvelopeSchema, config);
	if (!result.success) return { ok: false, issues: fromSchemaIssues(result.error.issues, []) };
	return { ok: true, data: result.data as FormConfigEnvelope };
}
