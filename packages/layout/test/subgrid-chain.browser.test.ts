import { afterEach, describe, expect, test } from 'vitest';
import {
	GRID_CLASS,
	GRID_CONTAINER_CLASS,
	GRID_ITEM_CLASS,
	GRID_SUBGRID_CLASS,
	createLayoutTheme,
	findSubgridChainBreaks,
} from '@/index';

const theme = createLayoutTheme({});
const containerTheme = createLayoutTheme({ grid: { query: 'container' } });

const mounted: HTMLElement[] = [];

afterEach(() => {
	for (const element of mounted.splice(0)) element.remove();
});

/** Mounts markup with both themes' stylesheets, so a case can also show what the browser does with the tracks. */
function mount(markup: string): HTMLElement {
	const host = document.createElement('div');
	host.style.width = '800px';
	host.innerHTML = `<style>${theme.css}${containerTheme.css}</style>${markup}`;
	document.body.append(host);
	mounted.push(host);
	return host;
}

const themed = `data-se-theme="${theme.id}"`;
const grid = `class="${GRID_CLASS}" ${themed} style="--se-grid-template:repeat(4,1fr)"`;
/** The subgrid item, spanning its grid's whole row as `getGridItemVariables` makes it. */
const item = (themeId: string) =>
	`class="${GRID_ITEM_CLASS} ${GRID_SUBGRID_CLASS}" data-se-theme="${themeId}" style="--se-item-grid-column:1 / -1"`;
const inner = `<div class="${GRID_CLASS} ${GRID_SUBGRID_CLASS}" ${themed} id="inner"><div class="${GRID_ITEM_CLASS}"></div></div>`;

/** Number of column tracks the browser lays `#inner` out on, from its first item's width against its own. */
function innerTracks(host: HTMLElement): number {
	const element = host.querySelector('#inner');
	const first = element?.firstElementChild;
	if (!element || !first) throw new Error('Expected #inner with an item');
	return Math.round(element.getBoundingClientRect().width / first.getBoundingClientRect().width);
}

describe('findSubgridChainBreaks', () => {
	test('passes a chain where every box between the subgrid and its grid carries the class', () => {
		const host = mount(`
			<div ${grid}>
				<div ${item(theme.id)}>
					<div class="${GRID_SUBGRID_CLASS}" ${themed}>${inner}</div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([]);
		expect(innerTracks(host), 'the browser passes the four tracks down').toBe(4);
	});

	test('passes a container-mode grid whose query wrapper sits above the grid, not in the chain', () => {
		const contained = `data-se-theme="${containerTheme.id}"`;
		const host = mount(`
			<div class="${GRID_CONTAINER_CLASS}" ${contained}>
				<div class="${GRID_CLASS}" ${contained} style="--se-grid-template:repeat(4,1fr)">
					<div ${item(containerTheme.id)}>
						<div class="${GRID_CLASS} ${GRID_SUBGRID_CLASS}" ${contained} id="inner"><div class="${GRID_ITEM_CLASS}"></div></div>
					</div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([]);
		expect(innerTracks(host)).toBe(4);
	});

	test('reports a plain wrapper between the subgrid and its grid, which the browser lays out on one track', () => {
		const host = mount(`
			<div ${grid}>
				<div ${item(theme.id)}>
					<div class="field-wrapper" role="group">${inner}</div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([
			'div.field-wrapper sits between div#inner.se-grid.se-subgrid and its grid without the se-subgrid class',
		]);
		expect(innerTracks(host)).toBe(1);
	});

	test('reports a query wrapper between the subgrid and its grid', () => {
		const host = mount(`
			<div ${grid}>
				<div ${item(theme.id)}>
					<div class="${GRID_CONTAINER_CLASS}" ${themed}>${inner}</div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([
			`div.${GRID_CONTAINER_CLASS} sits between div#inner.se-grid.se-subgrid and its grid without the se-subgrid class`,
		]);
	});

	test('reports a box in the chain with the class but no data-se-theme, which the stylesheet does not reach', () => {
		const host = mount(`
			<div ${grid}>
				<div ${item(theme.id)}>
					<div class="${GRID_SUBGRID_CLASS}">${inner}</div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual(['div.se-subgrid has no data-se-theme']);
		expect(innerTracks(host)).toBe(1);
	});

	test('reports every box missing the class, innermost first', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_SUBGRID_CLASS}" ${themed}>
					<div class="outer"><section class="inner"><div class="${GRID_SUBGRID_CLASS}" ${themed}></div></section></div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([
			'section.inner sits between div.se-subgrid and its grid without the se-subgrid class',
			'div.outer sits between div.se-subgrid and its grid without the se-subgrid class',
		]);
	});

	test('checks a grid item that is not a subgrid like any other box', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_ITEM_CLASS}"><div class="${GRID_SUBGRID_CLASS}" ${themed}></div></div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([
			'div.se-grid-item sits between div.se-subgrid and its grid without the se-subgrid class',
		]);
	});

	test('takes a parent subgrid as the end of the chain, so a break is reported once, at the subgrid it cuts', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_SUBGRID_CLASS}" ${themed}>
					<div class="plain"><div class="${GRID_SUBGRID_CLASS}" ${themed}>${inner}</div></div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([
			'div.plain sits between div.se-subgrid and its grid without the se-subgrid class',
		]);
	});

	test('walks past the root to the grid, so a fragment is checked inside the grid it is mounted in', () => {
		const host = mount(`
			<div ${grid}>
				<div ${item(theme.id)} id="fragment">${inner}</div>
			</div>`);
		const fragment = host.querySelector('#fragment');
		if (!fragment) throw new Error('Expected #fragment');
		expect(findSubgridChainBreaks(fragment)).toEqual([]);
	});

	test('reports a subgrid with no grid above it once, without the boxes it passed', () => {
		const host = mount(
			`<div class="a"><div class="b"><div class="${GRID_SUBGRID_CLASS}" ${themed}></div></div></div>`,
		);
		expect(findSubgridChainBreaks(host)).toEqual(['div.se-subgrid has no se-grid grid above it']);
	});

	test('finds nothing in markup without a subgrid', () => {
		expect(findSubgridChainBreaks(mount(`<div ${grid}><div class="plain"></div></div>`))).toEqual([]);
	});
});
