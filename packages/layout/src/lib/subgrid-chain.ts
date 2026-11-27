import { GRID_CLASS, GRID_SUBGRID_CLASS } from './grid-styles';

/**
 * One place where the chain of `GRID_SUBGRID_CLASS` boxes from a subgrid to its grid is broken.
 *
 * @remarks
 * `box` is the element without the class that sits between `subgrid` and the grid, or `null` when
 * `subgrid` has no grid above it at all. `description` reads as a message on its own, with both
 * elements named as `tag.class.class`.
 */
export interface SubgridChainBreak {
	/** The element with `GRID_SUBGRID_CLASS` whose tracks the break cuts off. */
	subgrid: Element;
	/** The box between `subgrid` and its grid that lacks `GRID_SUBGRID_CLASS`, or `null` when no grid sits above `subgrid`. */
	box: Element | null;
	/** Sentence naming both elements, ready for a test failure. */
	description: string;
}

function describeElement(element: Element): string {
	const classes = Array.from(element.classList, (name) => `.${name}`).join('');
	return `${element.localName}${classes}`;
}

function hasClass(element: Element, name: string): boolean {
	return element.classList.contains(name);
}

/**
 * Finds every box that breaks the chain between a subgrid and the grid it takes its tracks from.
 *
 * @param root Element or document to search; every element under it with `GRID_SUBGRID_CLASS` is checked.
 * @returns One entry per offending box (or per subgrid with no grid above it), in document order. Empty when every chain is intact.
 *
 * @remarks
 * The stylesheet gives a `GRID_SUBGRID_CLASS` element `grid-template-columns: subgrid`, which only
 * takes tracks from its parent when that parent is a grid container too. So for each subgrid the walk
 * goes up one parent at a time and ends at the nearest ancestor that has `GRID_SUBGRID_CLASS` (a parent
 * subgrid, whose own chain is checked in its turn) or `GRID_CLASS` (the grid the chain hangs from).
 * Each box passed on the way without `GRID_SUBGRID_CLASS` is a break, whatever other classes it has, a
 * grid item and an ARIA wrapper included. A subgrid with no such ancestor up to the document root is
 * reported once with a `null` box, without the boxes it passed. The walk is not bounded by `root`, so a fragment that holds a subgrid
 * without its grid reports it.
 *
 * It checks the class on each box and nothing the browser computes: a `container-type` on a box, a
 * `<fieldset>` in the chain (see {@link GRID_SUBGRID_CLASS}) or a missing `data-se-theme` still break the
 * subgrid and are not reported. It reads the DOM only, so it needs no layout, runs in any DOM
 * implementation and is safe to import where there is none.
 *
 * @example
 * ```ts
 * expect(findSubgridChainBreaks(container).map((entry) => entry.description)).toEqual([]);
 * ```
 */
export function findSubgridChainBreaks(root: ParentNode): SubgridChainBreak[] {
	const breaks: SubgridChainBreak[] = [];
	for (const subgrid of Array.from(root.querySelectorAll(`.${GRID_SUBGRID_CLASS}`))) {
		const plain: Element[] = [];
		let box = subgrid.parentElement;
		while (box && !hasClass(box, GRID_SUBGRID_CLASS) && !hasClass(box, GRID_CLASS)) {
			plain.push(box);
			box = box.parentElement;
		}
		if (!box) {
			breaks.push({
				subgrid,
				box: null,
				description: `${describeElement(subgrid)} has no ${GRID_CLASS} grid above it`,
			});
			continue;
		}
		for (const element of plain) {
			breaks.push({
				subgrid,
				box: element,
				description: `${describeElement(element)} sits between ${describeElement(subgrid)} and its grid without the ${GRID_SUBGRID_CLASS} class`,
			});
		}
	}
	return breaks;
}
