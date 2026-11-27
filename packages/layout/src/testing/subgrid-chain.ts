import { GRID_CLASS, GRID_SUBGRID_CLASS } from '../lib/grid-styles';

function describeElement(element: Element): string {
	const id = element.id ? `#${element.id}` : '';
	const classes = Array.from(element.classList, (name) => `.${name}`).join('');
	return `${element.localName}${id}${classes}`;
}

/**
 * Finds every break in the chain of boxes between a subgrid and the grid it takes its tracks from.
 *
 * @param root Element or document to search; every element under it with `GRID_SUBGRID_CLASS` is checked.
 * @returns One sentence per break, naming the elements as `tag#id.class`, in document order. Empty when every chain is intact.
 *
 * @remarks
 * The stylesheet makes an element with `GRID_SUBGRID_CLASS` and `data-se-theme` a grid with
 * `grid-template-columns: subgrid`, which takes tracks only from a parent that is a grid container too.
 * For each subgrid the walk goes up one parent at a time and ends at the nearest ancestor with
 * `GRID_SUBGRID_CLASS` (a parent subgrid, whose own chain is checked in its turn) or `GRID_CLASS` (the grid
 * the chain hangs from). Reported are a subgrid without `data-se-theme`, each box passed on the way (a grid
 * item and an ARIA wrapper included) and, once, a subgrid with no such ancestor up to the document root. The
 * walk is not bounded by `root`, so a fragment can be checked inside the grid it is mounted in.
 *
 * It reads classes and attributes, nothing the browser computes: a `container-type` on a box or a
 * `<fieldset>` in the chain (see {@link GRID_SUBGRID_CLASS}) still break the subgrid and are not reported.
 *
 * @example
 * ```ts
 * expect(findSubgridChainBreaks(container)).toEqual([]);
 * ```
 */
export function findSubgridChainBreaks(root: ParentNode): string[] {
	const breaks: string[] = [];
	for (const subgrid of Array.from(root.querySelectorAll(`.${GRID_SUBGRID_CLASS}`))) {
		const name = describeElement(subgrid);
		if (!subgrid.hasAttribute('data-se-theme')) breaks.push(`${name} has no data-se-theme`);
		const passed: Element[] = [];
		let box = subgrid.parentElement;
		while (box && !box.classList.contains(GRID_SUBGRID_CLASS) && !box.classList.contains(GRID_CLASS)) {
			passed.push(box);
			box = box.parentElement;
		}
		if (!box) {
			breaks.push(`${name} has no ${GRID_CLASS} grid above it`);
			continue;
		}
		for (const element of passed) {
			breaks.push(
				`${describeElement(element)} sits between ${name} and its grid without the ${GRID_SUBGRID_CLASS} class`,
			);
		}
	}
	return breaks;
}
