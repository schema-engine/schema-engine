import type { JsxRenderable } from '@ecopages/jsx';
import { GRID_CLASS, GRID_SUBGRID_CLASS, getDefaultLayoutTheme, getGridVariables } from '@schema-engine/layout';
import { gridTrackItems, type FormEngineRuntime as FormEngine } from '@schema-engine/forms';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { GridContainer } from './grid-container';

interface ChildGridBaseProps {
	/** The engine whose layout theme applies; else the engine rendering this element, else the library default. */
	engine?: FormEngine;
	/** Classes put on the grid element before `se-form-grid se-grid`. */
	class?: string;
	children?: JsxRenderable;
}

/** A grid with tracks of its own, decided by the elements it places. */
interface OwnTracksChildGridProps extends ChildGridBaseProps {
	/** The elements the grid places, which decide its tracks. */
	elements: readonly unknown[];
	subgrid?: false;
}

/** A grid on the tracks of the grid its container sits in, which has no `elements` to read. */
interface SubgridChildGridProps extends ChildGridBaseProps {
	/**
	 * Lay the children out on the column tracks and gap of the grid this container sits in, instead of tracks of its own.
	 *
	 * @remarks
	 * Set it when the container's own `grid` has `subgrid: true`. Every box between that container's item
	 * and this grid must carry the `se-subgrid` class (`GRID_SUBGRID_CLASS` of `@schema-engine/layout`),
	 * and none may be a query container or a `<fieldset>`, or the browser drops the tracks without a warning.
	 */
	subgrid: true;
	elements?: never;
}

/** Either `elements`, for tracks of its own, or `subgrid`, for the tracks of the grid around the container; never both. */
export type ChildGridProps = OwnTracksChildGridProps | SubgridChildGridProps;

/**
 * The grid of a container element's children, such as a fieldset's or an array row's.
 *
 * @remarks
 * The grid lays its direct children out the way a step does. It takes twelve tracks when an element sets `width`
 * or `offset`, counting the children of a subgrid element among them, and otherwise stays the engine's single column.
 * The theme comes from the given engine, else the engine rendering this element, else the library default. Under a
 * `query: 'container'` layout theme it also renders the `se-grid-container` wrapper around the grid, so the
 * breakpoints follow that wrapper and a nested grid follows its own box; under a theme that queries the window it
 * renders the grid alone.
 *
 * With `subgrid` the grid has no tracks and no wrapper of its own: it carries the `se-subgrid` class, no inline track
 * variables, and queries the breakpoints of the grid around the container.
 */
export function ChildGrid(props: ChildGridProps): JsxRenderable {
	const { engine, class: className, children } = props;
	const owner = engine ?? resolveFormEngine();
	const layout = owner?.getLayout() ?? getDefaultLayoutTheme();
	const classes = `${className ? `${className} ` : ''}se-form-grid ${GRID_CLASS}`;
	if (props.subgrid) {
		return (
			<div class={`${classes} ${GRID_SUBGRID_CLASS}`} data-se-theme={layout.id}>
				{children}
			</div>
		);
	}
	return (
		<GridContainer engine={owner}>
			<div
				class={classes}
				data-se-theme={layout.id}
				style={getGridVariables(undefined, layout.grid, gridTrackItems(props.elements))}
			>
				{children}
			</div>
		</GridContainer>
	);
}
