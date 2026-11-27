import { afterEach, describe, expect, test } from 'vitest';
import { GRID_CLASS, GRID_ITEM_CLASS, GRID_SUBGRID_CLASS, createLayoutTheme, findSubgridChainBreaks } from '@/index';

const theme = createLayoutTheme({});

const mounted: HTMLElement[] = [];

afterEach(() => {
	for (const element of mounted.splice(0)) element.remove();
});

/** Mounts markup with the theme's stylesheet, so the intact case can also show the browser takes the tracks. */
function mount(markup: string): HTMLElement {
	const host = document.createElement('div');
	host.innerHTML = `<style>${theme.css}</style>${markup}`;
	document.body.append(host);
	mounted.push(host);
	return host;
}

const themed = `data-se-theme="${theme.id}"`;
const grid = `class="${GRID_CLASS}" ${themed} style="--se-grid-template:repeat(4,1fr)"`;

function template(host: HTMLElement, selector: string): string {
	const element = host.querySelector(selector);
	if (!element) throw new Error(`Expected ${selector}`);
	return getComputedStyle(element).gridTemplateColumns;
}

describe('findSubgridChainBreaks', () => {
	test('passes a chain where every box between the subgrid and its grid carries the class', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_ITEM_CLASS} ${GRID_SUBGRID_CLASS}" ${themed}>
					<div class="${GRID_SUBGRID_CLASS}" ${themed}>
						<div class="${GRID_CLASS} ${GRID_SUBGRID_CLASS}" ${themed} id="inner"><div class="${GRID_ITEM_CLASS}"></div></div>
					</div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host)).toEqual([]);
		expect(template(host, '#inner')).toMatch(/^subgrid/);
	});

	test('reports a plain wrapper between the subgrid and its grid', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_ITEM_CLASS} ${GRID_SUBGRID_CLASS}" ${themed}>
					<div class="field-wrapper" role="group">
						<div class="${GRID_CLASS} ${GRID_SUBGRID_CLASS}" ${themed} id="inner"><div class="${GRID_ITEM_CLASS}"></div></div>
					</div>
				</div>
			</div>`);
		const found = findSubgridChainBreaks(host);
		expect(found).toHaveLength(1);
		expect(found[0]?.subgrid).toBe(host.querySelector('#inner'));
		expect(found[0]?.box).toBe(host.querySelector('.field-wrapper'));
		expect(found[0]?.description).toBe(
			'div.field-wrapper sits between div.se-grid.se-subgrid and its grid without the se-subgrid class',
		);
	});

	test('reports every box missing the class, innermost first', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_SUBGRID_CLASS}" ${themed}>
					<div class="outer"><section class="inner"><div class="${GRID_SUBGRID_CLASS}" ${themed}></div></section></div>
				</div>
			</div>`);
		expect(findSubgridChainBreaks(host).map((entry) => entry.box?.localName)).toEqual(['section', 'div']);
	});

	test('checks a grid item that is not a subgrid like any other box', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_ITEM_CLASS}"><div class="${GRID_SUBGRID_CLASS}" ${themed}></div></div>
			</div>`);
		expect(findSubgridChainBreaks(host).map((entry) => entry.box?.className)).toEqual([GRID_ITEM_CLASS]);
	});

	test('takes a parent subgrid as the end of the chain, so a break is reported once, at the subgrid it cuts', () => {
		const host = mount(`
			<div ${grid}>
				<div class="${GRID_SUBGRID_CLASS}" ${themed}>
					<div class="plain"><div class="${GRID_SUBGRID_CLASS}" ${themed}>
						<div class="${GRID_CLASS} ${GRID_SUBGRID_CLASS}" ${themed}></div>
					</div></div>
				</div>
			</div>`);
		const found = findSubgridChainBreaks(host);
		expect(found).toHaveLength(1);
		expect(found[0]?.box?.className).toBe('plain');
	});

	test('reports a subgrid with no grid above it once, without the boxes it passed', () => {
		const host = mount(
			`<div class="a"><div class="b"><div class="${GRID_SUBGRID_CLASS}" ${themed}></div></div></div>`,
		);
		const found = findSubgridChainBreaks(host);
		expect(found).toHaveLength(1);
		expect(found[0]?.box).toBeNull();
		expect(found[0]?.description).toBe('div.se-subgrid has no se-grid grid above it');
	});

	test('finds nothing in markup without a subgrid', () => {
		expect(findSubgridChainBreaks(mount(`<div ${grid}><div class="plain"></div></div>`))).toEqual([]);
	});
});
