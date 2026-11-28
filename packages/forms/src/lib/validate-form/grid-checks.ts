import type { FormTaggedConfig } from '@/schemas/form-config.js';
import type { ContainerKind } from '@/types/registration.js';
import { getElementChildren } from '@/lib/element-children.js';
import { placedTrackItems, type PlacedItem } from '@/lib/grid-track-items.js';
import {
	areaNames,
	areaTemplateIssues,
	cascadeValues,
	elementAreaSlots,
	elementHiddenSlots,
	elementGridKeys,
	elementIsSubgrid,
	elementUsesGridWidths,
	GRID_TEMPLATE_KEYS,
	gridAreaTemplates,
	gridSpanIssues,
	gridUsesAreas,
	namedPlacementOverflow,
	spanPlacementIssue,
	subgridPlacementIssue,
	WIDTH_TRACKS,
	type CascadeSlot,
	type GridLayoutConfig,
} from '@schema-engine/layout';
import { isTaggedConfig, issueAt, isRecord, type FormValidationIssue, type Path } from './issues.js';

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
export function elementGridKeyPath(item: FormTaggedConfig, keys: readonly string[], slot?: CascadeSlot): Path {
	const path = gridKeyPath(item.grid, keys, slot);
	return path ? ['grid', ...path] : ['grid'];
}

/** Where a grid's `areas` template for a slot sits, below the grid. An array is the `default` template itself. */
function areasPath(grid: GridLayoutConfig | undefined, slot: CascadeSlot): Path {
	return Array.isArray(grid?.areas) ? ['areas'] : ['areas', slot];
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
export function namedPlacementIssue(item: FormTaggedConfig): FormValidationIssue | undefined {
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
function atSlot(slot: string): string {
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
export function areaPlacementIssue(item: FormTaggedConfig, nested: boolean): FormValidationIssue | undefined {
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

/**
 * Why a field's `span` cannot sit beside its other placement, or `undefined` when it is fine.
 *
 * @remarks
 * A span is a placement of its own, so a `width`, `offset`, raw `column` or `area` in the same slot would give
 * the field two answers; different slots may differ. Applies at every depth. The path is relative to the element.
 */
export function spanIssue(item: FormTaggedConfig): FormValidationIssue | undefined {
	const issue = spanPlacementIssue(item);
	return issue ? issueAt(issue.path, `${elementLabel(item)} ${issue.message}`) : undefined;
}

/**
 * Why an element cannot be a subgrid, or `undefined` when it can or is not one.
 *
 * @param kind The container semantics the element's registration declares.
 *
 * @remarks
 * A subgrid lays its children on its parent's tracks, so it needs children, and its own placement must
 * leave it spanning the parent's full row (see `subgridPlacementIssue`). An array is rejected for now:
 * its rows are each a box of their own and do not pass the tracks on. The path is relative to the element.
 */
export function subgridIssue(item: FormTaggedConfig, kind: ContainerKind | undefined): FormValidationIssue | undefined {
	if (!elementIsSubgrid(item)) return undefined;
	const label = elementLabel(item);
	const path = elementGridKeyPath(item, ['subgrid']);
	if (kind === 'array') {
		return issueAt(
			path,
			`${label} sets grid 'subgrid' but is an array; subgrid rows are not supported yet, so only a container that lays its children out as one group can use 'subgrid'.`,
		);
	}
	if (!getElementChildren(item)) {
		return issueAt(
			path,
			`${label} sets grid 'subgrid' but has no elements; only a container can lay its children on its parent's tracks.`,
		);
	}
	const placement = subgridPlacementIssue(item);
	return placement ? issueAt(placement.path, `${label} ${placement.message}`) : undefined;
}

/**
 * An element of a step whose own schema passed, with where it sits in the form and the children that did.
 *
 * @remarks
 * An element with an issue of its own still counts: placement is checked on everything that parsed.
 */
export interface PlacedElement extends PlacedItem {
	element: FormTaggedConfig;
	children?: readonly PlacedElement[];
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
export function templateIssues(
	label: string,
	grid: GridLayoutConfig | undefined,
	gridPath: Path,
): FormValidationIssue[] {
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
	for (const { path, message } of areaTemplateIssues(grid)) {
		const slot = String(path[1] ?? 'default');
		issues.push(issueAt([...gridPath, ...path], `${label} areas${atSlot(slot)}: ${message}`));
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
 *
 * The widths check reads the grid's track items, which include the children of a subgrid, since they sit
 * on this grid's tracks. When the offender is such a child the issue is at its own `width` or `offset`,
 * the key to remove; for a direct child it stays at the grid's tracks, as it always was.
 */
export function fieldPlacementIssues(
	label: string,
	grid: GridLayoutConfig | undefined,
	scope: GridScope,
	templatesValid: boolean,
	sharedBySteps: boolean,
): FormValidationIssue[] {
	const usesAreas = gridUsesAreas(grid);
	const issues: FormValidationIssue[] = [];

	const widths = placedTrackItems(scope.elements)
		.filter((item): item is PlacedElement => isTaggedConfig(item.element))
		.find(({ element }) => elementUsesGridWidths(element));
	const exclusive = usesAreas ? ['areas'] : templateTrackKeys(grid);
	if (widths && exclusive.length > 0) {
		const tracksPath = gridKeyPath(grid, GRID_TEMPLATE_KEYS) ?? [];
		const inSubgrid = !scope.elements.some(({ element }) => element === widths.element);
		const path = inSubgrid
			? [...widths.path, ...elementGridKeyPath(widths.element, ['width', 'offset'])]
			: [...scope.gridPath, ...(usesAreas ? ['areas'] : tracksPath)];
		issues.push(
			issueAt(
				path,
				`${label} sets ${quotedKeys(exclusive)} but ${elementLabel(widths.element)} uses 'width' or 'offset'; a grid uses areas, widths or columns.`,
			),
		);
	}

	const tracked = placedTrackItems(scope.elements);
	for (const { path: relative, message } of gridSpanIssues(
		grid,
		tracked.map(({ element }) => element),
	)) {
		const [index, ...rest] = relative;
		const target = typeof index === 'number' ? tracked[index] : undefined;
		if (!target) continue;
		issues.push(
			issueAt([...target.path, ...rest], `${elementLabel(target.element as Record<string, unknown>)} ${message}`),
		);
	}

	if (usesAreas) {
		for (const { element, path } of scope.elements.filter(({ element }) => elementIsSubgrid(element))) {
			issues.push(
				issueAt(
					[...path, ...elementGridKeyPath(element, ['subgrid'])],
					`${elementLabel(element)} sets grid 'subgrid' but the ${label.toLowerCase()} draws 'areas'; a subgrid spans its parent's full row and cannot claim an area.`,
				),
			);
		}
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
