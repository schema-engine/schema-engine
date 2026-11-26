import type React from 'react';
import { GRID_CLASS, GRID_SUBGRID_CLASS, getDefaultLayoutTheme, getGridVariables } from '@schema-engine/layout';
import { gridTrackItems } from '@schema-engine/forms';
import { useOptionalFormEngine } from '@/hooks/use-form-context';
import { GridContainer } from './grid-container';

export interface ChildGridProps {
	/** The elements the grid places, which decide its tracks. Ignored when `subgrid` is set. */
	elements: readonly unknown[];
	/** Classes added to the grid element, after `se-form-grid se-grid`. */
	className?: string;
	/**
	 * Lay the children out on the column tracks and gap of the grid this container sits in, instead of tracks of its own.
	 *
	 * @remarks
	 * Set it when the container's own `grid` has `subgrid: true`. Every box between that container's item
	 * and this grid must carry the `se-subgrid` class (`GRID_SUBGRID_CLASS` of `@schema-engine/layout`),
	 * and none may be a query container, or the browser drops the tracks without a warning.
	 */
	subgrid?: boolean;
	children?: React.ReactNode;
}

/**
 * The grid of a container element's children, such as a fieldset's or an array row's.
 *
 * @remarks
 * The grid lays its direct children out the way a step does. It takes twelve tracks when an element sets `width`
 * or `offset`, counting the children of a subgrid element among them, and otherwise stays the engine's single
 * column. The theme comes from the engine context, with the library default outside a `FormEngineProvider`. Under
 * a `query: 'container'` layout theme it also renders the `se-grid-container` wrapper around the grid, so the
 * breakpoints follow that wrapper and a nested grid follows its own box; under a theme that queries the window it
 * renders the grid alone.
 *
 * With `subgrid` the grid has no tracks and no wrapper of its own: it carries the `se-subgrid` class, no
 * inline track variables, and queries the breakpoints of the grid around the container.
 */
export function ChildGrid({ elements, className, subgrid = false, children }: ChildGridProps) {
	const layout = useOptionalFormEngine()?.engine.getLayout() ?? getDefaultLayoutTheme();
	const classes = [
		'se-form-grid',
		GRID_CLASS,
		...(subgrid ? [GRID_SUBGRID_CLASS] : []),
		...(className ? [className] : []),
	];
	if (subgrid) {
		return (
			<div className={classes.join(' ')} data-se-theme={layout.id}>
				{children}
			</div>
		);
	}
	return (
		<GridContainer>
			<div
				className={classes.join(' ')}
				data-se-theme={layout.id}
				style={getGridVariables(undefined, layout.grid, gridTrackItems(elements))}
			>
				{children}
			</div>
		</GridContainer>
	);
}
