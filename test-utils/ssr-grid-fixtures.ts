/**
 * Config fixtures for the renderers' SSR grid acceptance tests.
 *
 * @remarks
 * Kept apart from the assertions in `ssr-grid-acceptance.ts` because the Node-side
 * global setup renders these forms, and importing `vitest`'s `expect` there throws
 * outside a test worker. Both renderers read the same fixtures so theirs cannot drift apart.
 */

/**
 * Fields of the named width acceptance fixture, authored once for both
 * renderers so their fixtures cannot drift apart.
 *
 * @remarks
 * `Responsive` is full width until `md` (48rem by default) and a third from
 * there. `Plain` sets no grid config and must fill the row. The two raw fields
 * keep CSS grid semantics on the twelve tracks: `span 2` is two of twelve.
 */
export const SSR_WIDTH_FIELDS = [
	{ id: 'half-a', label: 'Half A', grid: { width: 'half' } },
	{ id: 'half-b', label: 'Half B', grid: { width: 'half' } },
	{ id: 'responsive', label: 'Responsive', grid: { width: 'full', responsive: { md: { width: 'third' } } } },
	{ id: 'centred', label: 'Centred', grid: { width: 'half', offset: 'quarter' } },
	{ id: 'plain', label: 'Plain', grid: undefined },
	{ id: 'raw-span', label: 'Raw span', grid: { column: 'span 2' } },
	{ id: 'raw-lines', label: 'Raw lines', grid: { column: '4 / 10' } },
] as const;

/**
 * Children of a container, authored once for both renderers: two halves and a
 * sibling that sets no width. The fieldset and the array row use the same
 * three, with the label prefix telling the groups apart.
 */
export function ssrNestedFields(prefix: 'Nest' | 'Row') {
	return [
		{ id: `${prefix.toLowerCase()}-a`, label: `${prefix} A`, grid: { width: 'half' } },
		{ id: `${prefix.toLowerCase()}-b`, label: `${prefix} B`, grid: { width: 'half' } },
		{ id: `${prefix.toLowerCase()}-plain`, label: `${prefix} plain`, grid: undefined },
	] as const;
}

/** Rows of the drawn layout from the issue: `a` spans three columns and two rows. */
export const SSR_AREA_ROWS = ['a a a b b b', 'a a a c c c', 'd d e e e e'] as const;

/**
 * Config of a form that draws its layout, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @remarks
 * The step grid carries the template and five fields each claim one area, so
 * the placement comes from the step grid and the fields' `area` alone.
 */
export function ssrAreasForm(type: string) {
	return {
		id: 'ssr-areas-acceptance',
		title: 'SSR areas acceptance',
		steps: [
			{
				id: 'main',
				title: 'Main',
				grid: { areas: [...SSR_AREA_ROWS] },
				elements: ['a', 'b', 'c', 'd', 'e'].map((area) => ({
					$type: type,
					id: `area-${area}`,
					name: `area-${area}`,
					label: `Area ${area.toUpperCase()}`,
					grid: { area },
				})),
			},
		],
	};
}

/**
 * Config of a two-step form where one step draws its own responsive template,
 * authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @remarks
 * The `address` step stacks its fields from `default` and draws two rows from
 * `md`. The form grid has two columns, which the other step keeps.
 */
export function ssrSteppedForm(type: string) {
	const input = (label: string, grid?: { area: string }) => ({
		$type: type,
		id: label.toLowerCase().replace(' ', '-'),
		name: label.toLowerCase().replace(' ', '-'),
		label,
		grid,
	});
	return {
		id: 'ssr-stepped-acceptance',
		title: 'SSR stepped acceptance',
		grid: { columns: 2 },
		steps: [
			{
				id: 'address',
				title: 'Address',
				grid: { areas: { default: ['street', 'city', 'zip'], md: ['street street', 'city zip'] } },
				elements: ['Street', 'City', 'Zip'].map((label) => input(label, { area: label.toLowerCase() })),
			},
			{ id: 'other', title: 'Other', elements: [input('Other A'), input('Other B')] },
		],
	};
}

/**
 * Layout theme of the container query acceptance: breakpoints measure the grid's wrapper, and the
 * default gap grows from `md`, so the gap ramp is under test with the template and the placement.
 */
export const SSR_CONTAINER_LAYOUT = {
	grid: { query: 'container', gap: { default: '1rem' }, responsive: { md: { default: '2rem' } } },
} as const;

/**
 * Config of a form whose grid has one column and two from `md`, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @remarks
 * `Spanning` takes one column by default and two from `md`, so its placement shows which width the
 * items were measured against. `Plain` sets nothing.
 */
export function ssrContainerForm(type: string) {
	return {
		id: 'ssr-container-acceptance',
		title: 'SSR container acceptance',
		grid: { columns: 1, responsive: { md: { columns: 2 } } },
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: type,
						id: 'spanning',
						name: 'spanning',
						label: 'Spanning field',
						grid: { column: 'span 1', responsive: { md: { column: 'span 2' } } },
					},
					{ $type: type, id: 'plain', name: 'plain', label: 'Plain field' },
				],
			},
		],
	};
}
