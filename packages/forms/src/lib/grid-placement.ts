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
	for (const slot of ['default', ...BREAKPOINT_ORDER] as const) {
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
