import type { GridBreakpointConfig, GridOffsetName, GridWidthName } from '@/schemas/grid';
import type { LayoutIssue } from './layout-issue';

/**
 * Reads of an element's grid placement shared by the stylesheet emitter and
 * validation, so the cascade the author is checked against is the one emitted.
 *
 * @remarks
 * Elements arrive as `unknown` because they are read before, or without, a
 * registered schema narrowing them: a registration may declare `grid` loosely.
 */

export const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

/** Named breakpoint tokens. Thresholds are configured on the layout theme's `grid` option. */
export type GridBreakpointToken = (typeof BREAKPOINT_ORDER)[number];

export type CascadeSlot = 'default' | GridBreakpointToken;

/** Every slot of the cascade, narrowest first. */
export const CASCADE_SLOTS: readonly CascadeSlot[] = ['default', ...BREAKPOINT_ORDER];

/** Tracks a grid has once its items use named widths. */
export const WIDTH_TRACKS = 12;

export const WIDTH_SPANS: Readonly<Record<GridWidthName, number>> = {
	full: 12,
	'three-quarters': 9,
	'two-thirds': 8,
	half: 6,
	third: 4,
	quarter: 3,
};

/**
 * Grid keys that define the template, and so cannot meet named widths.
 *
 * @remarks
 * Typed against the breakpoint schema so a renamed key fails to compile here.
 */
export const GRID_TEMPLATE_KEYS = [
	'columns',
	'minColumnWidth',
] as const satisfies readonly (keyof GridBreakpointConfig)[];

/** The width and offset an item has authored so far, carried through the cascade. */
export interface NamedPlacement {
	width?: GridWidthName;
	offset?: GridOffsetName;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * An element's grid entries in cascade order: the top level, `responsive.default`,
 * then each breakpoint that is set.
 */
export function elementGridSlots(element: unknown): Array<{ slot: CascadeSlot; entry: Record<string, unknown> }> {
	if (!isRecord(element) || !isRecord(element.grid)) return [];
	const grid = element.grid;
	const slots: Array<{ slot: CascadeSlot; entry: Record<string, unknown> }> = [{ slot: 'default', entry: grid }];
	const responsive = grid.responsive;
	if (!isRecord(responsive)) return slots;
	for (const slot of CASCADE_SLOTS) {
		const entry = responsive[slot];
		if (isRecord(entry)) slots.push({ slot, entry });
	}
	return slots;
}

/** Keys an element's `grid` config sets to a value, at the top level or in any breakpoint. */
export function elementGridKeys(element: unknown): ReadonlySet<string> {
	const keys = new Set<string>();
	for (const { entry } of elementGridSlots(element)) {
		for (const [key, value] of Object.entries(entry)) {
			if (key !== 'responsive' && value !== undefined) keys.add(key);
		}
	}
	return keys;
}

export function elementUsesGridWidths(element: unknown): boolean {
	const keys = elementGridKeys(element);
	return keys.has('width') || keys.has('offset');
}

export function usesGridWidths(elements: readonly unknown[]): boolean {
	return elements.some(elementUsesGridWidths);
}

/** Whether an element lays its children on its parent grid's tracks (`grid.subgrid`). */
export function elementIsSubgrid(element: unknown): boolean {
	return isRecord(element) && isRecord(element.grid) && element.grid.subgrid === true;
}

/** Placement keys a subgrid cannot set: it always spans its parent's full row and is stretched on it. */
const SUBGRID_EXCLUSIVE_KEYS = ['width', 'offset', 'column', 'area', 'span', 'justifySelf', 'placeSelf'] as const;

/**
 * Why a subgrid's placement is invalid, or `undefined` when it is fine.
 *
 * @remarks
 * A subgrid spans its parent's full row, so a `width`, `offset`, `span`, raw `column` or `area` would make it
 * span less, and CSS ignores `justify-self` on a subgrid. The path is relative to the element and names the first
 * conflicting key at the slot that sets it, as authored; the message is a clause the domain prefixes with
 * the element's name.
 */
export function subgridPlacementIssue(element: unknown): LayoutIssue | undefined {
	if (!elementIsSubgrid(element)) return undefined;
	for (const { slot, entry } of elementGridSlots(element)) {
		const key = SUBGRID_EXCLUSIVE_KEYS.find((name) => entry[name] !== undefined);
		if (key === undefined) continue;
		return {
			path: slot === 'default' ? ['grid', key] : ['grid', 'responsive', slot, key],
			message: `sets grid 'subgrid' and '${key}'; a subgrid spans its parent's full row, so it takes no 'width', 'offset', 'column', 'area', 'span', 'justifySelf' or 'placeSelf'.`,
		};
	}
	return undefined;
}

/** Placement keys that `span` cannot share a slot with, because each sets the item's `grid-column` too. */
const SPAN_EXCLUSIVE_KEYS = ['width', 'offset', 'column', 'area'] as const;

/**
 * Why an element's `span` cannot sit beside its other placement, or `undefined` when it is fine.
 *
 * @remarks
 * `span` sets the item's column like `width`, `offset`, a raw `column` and an `area` do, so a slot that
 * sets it and one of them would have two answers. Slots may differ: a narrower slot's `width` and a
 * wider slot's `span` is the usual way to change sizing mode. The path is relative to the element and
 * names the first conflicting key at the slot that sets it, as authored; the message is a clause the
 * domain prefixes with the element's name.
 */
export function spanPlacementIssue(element: unknown): LayoutIssue | undefined {
	for (const { slot, entry } of elementGridSlots(element)) {
		if (entry.span === undefined) continue;
		const key = SPAN_EXCLUSIVE_KEYS.find((name) => entry[name] !== undefined);
		if (key === undefined) continue;
		return {
			path: slot === 'default' ? ['grid', key] : ['grid', 'responsive', slot, key],
			message: `sets grid 'span' and '${key}'${slot === 'default' ? '' : ` at '${slot}'`}; a span is a placement of its own, so use 'span' or one of 'width', 'offset', 'column' and 'area' in a breakpoint, not together.`,
		};
	}
	return undefined;
}

/**
 * Where each element's `span` meets a grid whose track count CSS cannot know.
 *
 * @param grid The grid that places `elements`; one with no `columns: 'auto'` has no issue.
 * @param elements The elements the grid places: its items, and the children of every subgrid among them.
 *
 * @remarks
 * `columns: 'auto'` makes as many tracks as fit, a count that depends on the container's width and the
 * minimum column width and cannot be computed in CSS, so a span there falls back to one track. Rather than
 * render that silently, each element is checked against every slot where the grid's cascaded `columns` is
 * `'auto'`, with the span in effect there (the last one a narrower or equal slot set). The first such slot
 * is reported per element. A grid that draws `areas` or whose items use named widths has a known count
 * and has no issue.
 *
 * The path starts with the element's index in `elements`, then names the `span` key the author wrote at
 * the slot that sets the span in effect: `[2, 'grid', 'span']` or `[2, 'grid', 'responsive', 'md', 'span']`.
 * The message is a clause the domain prefixes with the element's name.
 */
export function gridSpanIssues(grid: unknown, elements: readonly unknown[]): LayoutIssue[] {
	if (!isRecord(grid) || gridUsesAreas(grid) || usesGridWidths(elements)) return [];
	const columns: Partial<Record<CascadeSlot, unknown>> = {};
	for (const { slot, entry } of elementGridSlots({ grid })) columns[slot] = entry.columns ?? columns[slot];
	const autoSlots = cascadeValues(columns)
		.filter(({ value }) => value === 'auto')
		.map(({ slot }) => slot);
	if (autoSlots.length === 0) return [];

	const issues: LayoutIssue[] = [];
	elements.forEach((element, index) => {
		const spans: Partial<Record<CascadeSlot, number>> = {};
		for (const { slot, entry } of elementGridSlots(element)) {
			if (typeof entry.span === 'number') spans[slot] = entry.span;
		}
		for (const slot of autoSlots) {
			const authoredAt = CASCADE_SLOTS.slice(0, CASCADE_SLOTS.indexOf(slot) + 1)
				.reverse()
				.find((candidate) => spans[candidate] !== undefined);
			if (authoredAt === undefined) continue;
			issues.push({
				path: [index, 'grid', ...(authoredAt === 'default' ? [] : ['responsive', authoredAt]), 'span'],
				message: `sets grid 'span' where the grid's columns are 'auto'${slot === 'default' ? '' : ` at '${slot}'`}; CSS cannot know how many tracks 'auto' makes, so the span falls back to one track. Set 'columns' to a number, per breakpoint if it changes, and use a theme with query 'container' so the breakpoints follow the card.`,
			});
			return;
		}
	});
	return issues;
}

/** Updates `carried` with the width and offset a slot authored; the other keeps its earlier value. */
export function carryNamedPlacement(carried: NamedPlacement, entry: NamedPlacement): void {
	carried.width = entry.width ?? carried.width;
	carried.offset = entry.offset ?? carried.offset;
}

/**
 * The first slot where an element's offset and width together pass the grid's
 * tracks, with the tracks they span, or `undefined` when none does.
 *
 * @remarks
 * Follows the same carry-over as emission: a slot that sets one of the pair is
 * checked against the other as the narrower slots left it, so two slots that
 * each look valid can still overflow together.
 */
export function namedPlacementOverflow(element: unknown): { slot: CascadeSlot; tracks: number } | undefined {
	const carried: NamedPlacement = {};
	for (const { slot, entry } of elementGridSlots(element)) {
		if (entry.width === undefined && entry.offset === undefined) continue;
		carryNamedPlacement(carried, entry as NamedPlacement);
		if (carried.width === undefined || carried.offset === undefined) continue;
		const tracks = (WIDTH_SPANS[carried.width] ?? 0) + (WIDTH_SPANS[carried.offset] ?? 0);
		if (tracks > WIDTH_TRACKS) return { slot, tracks };
	}
	return undefined;
}

/** The cells of each row of a template; `.` marks an empty cell. */
export type GridAreaRows = readonly (readonly string[])[];

/** Templates by the slot that sets them. */
export type GridAreaTemplates = Partial<Record<CascadeSlot, GridAreaRows>>;

const EMPTY_CELL = '.';

function splitRow(row: unknown): string[] {
	if (typeof row !== 'string') return [];
	return row
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((cell) => (/^\.+$/.test(cell) ? EMPTY_CELL : cell));
}

function toRows(rows: unknown): GridAreaRows | undefined {
	return Array.isArray(rows) ? rows.map(splitRow) : undefined;
}

/**
 * The templates a grid's `areas` sets, by slot. An array is the `default` template.
 *
 * @remarks
 * A run of dots is one empty cell, normalised to a single `.`, so a template
 * compares and emits the same however the author spaced it.
 */
export function gridAreaTemplates(grid: unknown): GridAreaTemplates {
	if (!isRecord(grid) || grid.areas === undefined) return {};
	if (Array.isArray(grid.areas)) {
		const rows = toRows(grid.areas);
		return rows ? { default: rows } : {};
	}
	if (!isRecord(grid.areas)) return {};
	const templates: GridAreaTemplates = {};
	for (const slot of CASCADE_SLOTS) {
		const rows = toRows(grid.areas[slot]);
		if (rows) templates[slot] = rows;
	}
	return templates;
}

/** Whether a grid draws its layout with `areas`. */
export function gridUsesAreas(grid: unknown): boolean {
	return Object.keys(gridAreaTemplates(grid)).length > 0;
}

/** Area names a template uses, in order of first appearance. */
export function areaNames(rows: GridAreaRows): string[] {
	const names = new Set<string>();
	for (const row of rows) {
		for (const cell of row) if (cell !== EMPTY_CELL) names.add(cell);
	}
	return [...names];
}

/** The `grid-template-areas` value for a template: one quoted string per row. */
export function areasTemplateValue(rows: GridAreaRows): string {
	return rows.map((row) => `"${row.join(' ')}"`).join(' ');
}

/**
 * The area an element authored at each slot it sets one. Within a slot,
 * `responsive.default` beats the top level, as in emission.
 */
export function elementAreaSlots(element: unknown): Partial<Record<CascadeSlot, string>> {
	const areas: Partial<Record<CascadeSlot, string>> = {};
	for (const { slot, entry } of elementGridSlots(element)) {
		if (typeof entry.area === 'string') areas[slot] = entry.area;
	}
	return areas;
}

/** Whether an element hides itself at each slot it sets `hidden`, in cascade order within a slot. */
export function elementHiddenSlots(element: unknown): Partial<Record<CascadeSlot, boolean>> {
	const hidden: Partial<Record<CascadeSlot, boolean>> = {};
	for (const { slot, entry } of elementGridSlots(element)) {
		if (typeof entry.hidden === 'boolean') hidden[slot] = entry.hidden;
	}
	return hidden;
}

/**
 * What each slot resolves to: the value set at that slot, else the last one a
 * narrower slot set.
 *
 * @remarks
 * Emission falls back through narrower slots in the stylesheet, so validation
 * reads templates and areas the same way to check what a viewport gets.
 */
export function cascadeValues<T>(
	authored: Partial<Record<CascadeSlot, T>>,
): Array<{ slot: CascadeSlot; value: T | undefined }> {
	let carried: T | undefined;
	return CASCADE_SLOTS.map((slot) => {
		carried = authored[slot] ?? carried;
		return { slot, value: carried };
	});
}

function cellCount(count: number): string {
	return `${count} ${count === 1 ? 'cell' : 'cells'}`;
}

function isRectangle(rows: GridAreaRows, name: string): boolean {
	const cells: Array<[row: number, column: number]> = [];
	rows.forEach((row, rowIndex) =>
		row.forEach((cell, columnIndex) => {
			if (cell === name) cells.push([rowIndex, columnIndex]);
		}),
	);
	const rowsUsed = cells.map(([row]) => row);
	const columnsUsed = cells.map(([, column]) => column);
	const height = Math.max(...rowsUsed) - Math.min(...rowsUsed) + 1;
	const width = Math.max(...columnsUsed) - Math.min(...columnsUsed) + 1;
	return height * width === cells.length;
}

/**
 * Why CSS would drop a template: rows of unequal length, or an area whose cells
 * do not fill a rectangle.
 *
 * @param grid A grid config; one that sets no `areas` has no issue.
 *
 * @remarks
 * Each issue's `path` is relative to the grid: `['areas']` for the array form of the default
 * template, else `['areas', slot]`. Rows of unequal length stop the check for that template, as no
 * area can be located in a ragged one.
 */
export function areaTemplateIssues(grid: unknown): LayoutIssue[] {
	const templates = gridAreaTemplates(grid);
	const arrayForm = isRecord(grid) && Array.isArray(grid.areas);
	const issues: LayoutIssue[] = [];
	for (const slot of CASCADE_SLOTS) {
		const rows = templates[slot];
		if (!rows) continue;
		const path = arrayForm ? ['areas'] : ['areas', slot];
		const width = rows[0]?.length ?? 0;
		const ragged = rows.findIndex((row) => row.length !== width);
		if (ragged !== -1) {
			issues.push({
				path,
				message: `row ${ragged + 1} has ${cellCount(rows[ragged]?.length ?? 0)} but row 1 has ${width}.`,
			});
			continue;
		}
		for (const name of areaNames(rows)) {
			if (!isRectangle(rows, name)) {
				issues.push({
					path,
					message: `area '${name}' is not rectangular; CSS drops the whole template unless every area fills a rectangle.`,
				});
			}
		}
	}
	return issues;
}
