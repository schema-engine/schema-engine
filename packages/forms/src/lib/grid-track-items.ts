import { elementIsSubgrid } from '@schema-engine/layout';
import { getElementChildren } from './element-children.js';
import { childPath, type Path } from './validate-form/issues.js';

/** An element and where it sits in the form, as validation reads it. */
export interface PlacedItem {
	element: unknown;
	path: Path;
	/**
	 * The children of the element, each with its own path, when the caller knows them better than the element does.
	 *
	 * @remarks
	 * Validation sets it from the registry's tree, so a child that failed never shifts the path of the ones after it
	 * and a cycle cannot be walked. Without it the walk reads the element's own `elements`, as the renderers do.
	 */
	children?: readonly PlacedItem[];
}

/**
 * The elements whose placement counts the tracks of the grid that lays out `placed`: the elements
 * themselves and, for each subgrid, its children, however deep.
 *
 * @remarks
 * A subgrid places its children on its parent's tracks, so a `width` inside it counts the parent's
 * tracks. A container that is not a subgrid draws tracks of its own and stops the walk. Order is depth
 * first, each subgrid right before its children. A child's path is its own `path` when the item lists its `children`,
 * else the parent's with `elements` and the child's index.
 */
export function placedTrackItems(placed: readonly PlacedItem[]): PlacedItem[] {
	const items: PlacedItem[] = [];
	const visit = ({ element, path, children }: PlacedItem): void => {
		items.push({ element, path });
		if (!elementIsSubgrid(element) || typeof element !== 'object' || element === null) return;
		if (children) {
			children.forEach(visit);
			return;
		}
		getElementChildren(element)?.forEach((child, index) => visit({ element: child, path: childPath(path, index) }));
	};
	placed.forEach(visit);
	return items;
}

/**
 * The elements whose placement counts the tracks of the grid that lays out `elements`.
 *
 * @remarks
 * Pass the result as `elements` to `getGridVariables`, so a grid takes twelve tracks when a child of a
 * subgrid sets a `width`. It is the set validation checks (see {@link placedTrackItems}). Both renderers
 * use it for a step's grid and for `ChildGrid`.
 */
export function gridTrackItems(elements: readonly unknown[]): unknown[] {
	return placedTrackItems(elements.map((element) => ({ element, path: [] }))).map(({ element }) => element);
}
