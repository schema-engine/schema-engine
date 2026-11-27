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

/** Which cascade a nested container fixture exercises: the outer grid's template, or its fieldset's placement. */
export type SsrNestedContainerVariant = 'template' | 'placement';

/**
 * Config of a form whose responsive fieldset sits in a wide grid but is itself narrow, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's input.
 * @param inputProps Props the input needs besides its id, name, label and `grid` (Radiant's `inputType`).
 * @param variant `template` makes the step grid one column and three from `md`, so the fieldset's grid
 * could inherit its parent's template gate. `placement` keeps the step grid at three columns and gives the
 * fieldset a placement from `md`, so the fieldset's items could inherit its placement gate.
 * @remarks
 * In a 900px container the fieldset spans one of three columns, about 290px, below `md` (48rem). The grid
 * the fieldset draws has the same slot names as the one around it and must stay at its own width.
 */
export function ssrNestedContainerForm(
	type: string,
	variant: SsrNestedContainerVariant,
	inputProps: Readonly<Record<string, unknown>> = {},
) {
	const child = (id: string, label: string) => ({
		$type: type,
		...inputProps,
		id,
		name: id,
		label,
		grid: { width: 'full', responsive: { md: { width: 'half' } } },
	});
	return {
		id: `ssr-nested-container-${variant}`,
		title: 'SSR nested container acceptance',
		grid: variant === 'template' ? { columns: 1, responsive: { md: { columns: 3 } } } : { columns: 3 },
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'fieldSet',
						id: 'group',
						name: 'group',
						legend: 'Group',
						grid:
							variant === 'placement'
								? { column: 'span 1', responsive: { md: { column: 'span 1' } } }
								: undefined,
						elements: [child('nest-a', 'Nest A'), child('nest-b', 'Nest B')],
					},
				],
			},
		],
	};
}

/**
 * The forms of the subgrid acceptance, by name.
 *
 * - `widths`: two half fields, then a subgrid fieldset of two half fields and one with no width.
 * - `through`: no width on the step's own fields; the two halves exist only inside the subgrid.
 * - `columns`: a two-column step with a wide gap, a field per column and a padded subgrid fieldset of two.
 * - `responsive`: full width, half from `md`, in the step and in the subgrid.
 * - `hidden`: a subgrid fieldset that hides from `md`.
 * - `nested`: a subgrid inside a subgrid, in a width grid.
 * - `container`: `responsive` under a container query theme.
 */
export type SsrSubgridVariant = 'widths' | 'through' | 'columns' | 'responsive' | 'hidden' | 'nested' | 'container';

export const SSR_SUBGRID_VARIANTS: readonly SsrSubgridVariant[] = [
	'widths',
	'through',
	'columns',
	'responsive',
	'hidden',
	'nested',
	'container',
];

/** The layout input a subgrid variant renders under: a container query theme for `container`, else the default. */
export function ssrSubgridLayout(variant: SsrSubgridVariant) {
	return variant === 'container' ? ({ grid: { query: 'container' } } as const) : undefined;
}

/**
 * Stylesheet a document of the `columns` variant gets, so the edge inset is a known amount in both renderers.
 *
 * @remarks
 * A fieldset's own `style` takes custom properties only, so the padding and border come from a rule on the
 * subgrid item, the outermost box of the chain in both renderers.
 */
export const SSR_SUBGRID_INSET_CSS = '.se-subgrid.se-grid-item{padding-inline:12px;border:2px solid;}';

/** Padding plus border of the rule above, per side. */
export const SSR_SUBGRID_INSET = 14;

/**
 * Config of a subgrid acceptance form, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's input.
 * @param inputProps Props the input needs besides its id, name, label and `grid` (Radiant's `inputType`).
 * @remarks
 * Labels are unique, so a test finds a field by its label. A field of a width variant is `half` or `adaptive`:
 * full width, half from `md`.
 */
export function ssrSubgridForm(
	variant: SsrSubgridVariant,
	type: string,
	inputProps: Readonly<Record<string, unknown>> = {},
) {
	const slug = (label: string) => label.toLowerCase().replaceAll(' ', '-');
	const input = (label: string, grid?: Record<string, unknown>) => ({
		$type: type,
		...inputProps,
		id: slug(label),
		name: slug(label),
		label,
		...(grid ? { grid } : {}),
	});
	const fieldset = (label: string, grid: Record<string, unknown>, elements: unknown[]) => ({
		$type: 'fieldSet',
		id: slug(label),
		name: slug(label),
		legend: label,
		grid,
		elements,
	});
	const half = { width: 'half' };
	const adaptive = { width: 'full', responsive: { md: { width: 'half' } } };
	const form = (elements: unknown[], grid?: Record<string, unknown>) => ({
		id: `ssr-subgrid-${variant}`,
		title: 'SSR subgrid acceptance',
		...(grid ? { grid } : {}),
		steps: [{ id: 'main', title: 'Main', elements }],
	});

	switch (variant) {
		case 'widths':
			return form([
				input('First', half),
				input('Last', half),
				fieldset('Address', { subgrid: true }, [input('Street', half), input('City', half), input('Notes')]),
			]);
		case 'through':
			return form([
				input('Plain'),
				fieldset('Address', { subgrid: true }, [input('Street', half), input('City', half)]),
			]);
		case 'columns':
			return form(
				[
					input('Col A'),
					input('Col B'),
					fieldset('Address', { subgrid: true }, [input('Col C'), input('Col D')]),
				],
				{ columns: 2, gap: 'wide' },
			);
		case 'responsive':
		case 'container':
			return form([
				input('First', adaptive),
				input('Last', adaptive),
				fieldset('Address', { subgrid: true }, [input('Street', adaptive), input('City', adaptive)]),
			]);
		case 'hidden':
			return form([
				input('First', half),
				fieldset('Address', { subgrid: true, responsive: { md: { hidden: true } } }, [input('Street', half)]),
			]);
		case 'nested':
			return form([
				input('First', half),
				input('Last', half),
				fieldset('Outer', { subgrid: true }, [
					fieldset('Inner', { subgrid: true }, [input('Street', half), input('City', half)]),
				]),
			]);
	}
}
