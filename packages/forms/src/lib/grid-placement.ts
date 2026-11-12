import type { GridBreakpointConfig, GridOffsetName, GridWidthName } from '@/schemas/base-field';

/**
 * Reads of an element's grid placement shared by the stylesheet emitter and
 * validation, so the cascade the author is checked against is the one emitted.
 *
 * @remarks
 * Elements arrive as `unknown` because they are read before, or without, a
 * registered schema narrowing them: a registration may declare `grid` loosely.
 */

export const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

/** Named breakpoint tokens. Thresholds are configured on the engine. */
export type GridBreakpointToken = (typeof BREAKPOINT_ORDER)[number];

export type CascadeSlot = 'default' | GridBreakpointToken;

/** Every slot of the cascade, narrowest first. */
export const CASCADE_SLOTS: readonly CascadeSlot[] = ['default', ...BREAKPOINT_ORDER];

/** Tracks a grid has once its fields use named widths. */
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
 * Form grid keys that define the template, and so cannot meet named widths.
 *
 * @remarks
 * Typed against the breakpoint schema so a renamed key fails to compile here.
 */
export const GRID_TEMPLATE_KEYS = [
	'columns',
	'minColumnWidth',
] as const satisfies readonly (keyof GridBreakpointConfig)[];

/** The width and offset a field has authored so far, carried through the cascade. */
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

export interface AreaTemplateIssue {
	slot: CascadeSlot;
	message: string;
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
 * @remarks
 * Rows of unequal length stop the check for that template, as no area can be
 * located in a ragged one.
 */
export function areaTemplateIssues(templates: GridAreaTemplates): AreaTemplateIssue[] {
	const issues: AreaTemplateIssue[] = [];
	for (const slot of CASCADE_SLOTS) {
		const rows = templates[slot];
		if (!rows) continue;
		const width = rows[0]?.length ?? 0;
		const ragged = rows.findIndex((row) => row.length !== width);
		if (ragged !== -1) {
			issues.push({
				slot,
				message: `row ${ragged + 1} has ${cellCount(rows[ragged]?.length ?? 0)} but row 1 has ${width}.`,
			});
			continue;
		}
		for (const name of areaNames(rows)) {
			if (!isRectangle(rows, name)) {
				issues.push({
					slot,
					message: `area '${name}' is not rectangular; CSS drops the whole template unless every area fills a rectangle.`,
				});
			}
		}
	}
	return issues;
}
