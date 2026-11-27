import { afterEach, describe, expect, test } from 'vitest';
import {
	createLayoutTheme,
	getGridItemVariables,
	getGridVariables,
	type ElementGridConfig,
	type GridLayoutConfig,
} from '@/index';

/**
 * Measures the grid a document describes, as a browser lays it out, in each engine the project runs.
 *
 * @remarks
 * Each case renders into an iframe, so a media query reads the width given to the frame and a test can
 * put a wide container in a narrow window. The cases build the markup from the package's own emitters
 * and stylesheet and nothing else, so they check what the renderers' output does, not a copy of it.
 */

const frames: HTMLIFrameElement[] = [];

afterEach(() => {
	for (const frame of frames.splice(0)) frame.remove();
});

function style(variables: Record<string, string | undefined>, extra = ''): string {
	const declarations = Object.entries(variables)
		.filter(([, value]) => value !== undefined)
		.map(([name, value]) => `${name}:${value}`);
	return [...declarations, ...(extra ? [extra] : [])].join(';');
}

interface Item {
	grid?: ElementGridConfig;
	/** Extra declarations, for example a height. */
	css?: string;
	/** Children of an item that is a subgrid, as the markup of a grid placed on the parent's tracks. */
	subgrid?: Item[];
}

interface Case {
	query: 'media' | 'container';
	grid: GridLayoutConfig;
	items: Item[];
	/** Width of the window the markup renders in. */
	windowWidth: number;
	/** Width of the wrapper the grid is measured against; container mode only. */
	containerWidth?: number;
}

interface Rendered {
	grid: HTMLElement;
	items: HTMLElement[];
	document: Document;
	box: (element: Element) => DOMRect;
}

const ITEM_HEIGHT = 'height:20px';

async function render({ query, grid, items, windowWidth, containerWidth }: Case): Promise<Rendered> {
	const theme = createLayoutTheme({ grid: { query } });
	const itemMarkup = (item: Item, index: number): string => {
		const config = item.subgrid ? { ...item.grid, subgrid: true } : item.grid;
		const inline = style(getGridItemVariables(config), item.css ?? (item.subgrid ? '' : ITEM_HEIGHT));
		if (!item.subgrid) {
			return `<div class="se-grid-item" data-se-theme="${theme.id}" data-index="${index}" style="${inline}"></div>`;
		}
		return `<div class="se-grid-item se-subgrid" data-se-theme="${theme.id}" style="${inline}"><div class="se-grid se-subgrid" data-se-theme="${theme.id}" data-subgrid>${item.subgrid.map(itemMarkup).join('')}</div></div>`;
	};
	const gridMarkup = `<div class="se-grid" data-se-theme="${theme.id}" data-grid style="${style(
		getGridVariables(
			grid,
			theme.grid,
			items.flatMap((item) => [item, ...(item.subgrid ?? [])]).map((item) => ({ grid: item.grid })),
		),
	)}">${items.map(itemMarkup).join('')}</div>`;
	const body =
		query === 'container'
			? `<div class="se-grid-container" data-se-theme="${theme.id}" style="width:${containerWidth ?? windowWidth}px">${gridMarkup}</div>`
			: gridMarkup;

	const frame = document.createElement('iframe');
	frame.style.cssText = `width:${windowWidth}px;height:600px;border:0;display:block`;
	frame.srcdoc = `<!doctype html><html><head><style>body{margin:0}${theme.css}</style></head><body>${body}</body></html>`;
	frames.push(frame);
	await new Promise<void>((resolve) => {
		frame.addEventListener('load', () => resolve(), { once: true });
		document.body.append(frame);
	});
	const frameDocument = frame.contentDocument;
	if (!frameDocument) throw new Error('The frame has no document.');
	const gridElement = frameDocument.querySelector<HTMLElement>('[data-grid]');
	if (!gridElement) throw new Error('The grid did not render.');
	return {
		grid: gridElement,
		items: Array.from(frameDocument.querySelectorAll<HTMLElement>('[data-index]')),
		document: frameDocument,
		box: (element) => element.getBoundingClientRect(),
	};
}

function trackCount(grid: HTMLElement): number {
	return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
}

const NO_GAP = { gap: 'none' } as const;

describe('a numeric span never overflows the grid', () => {
	const dense = {
		...NO_GAP,
		columns: 4,
		autoFlow: 'dense',
		responsive: { md: { columns: 12 } },
	} as const satisfies GridLayoutConfig;
	const spans: Item[] = [{ grid: { span: 2 } }, { grid: { span: 7 } }, { grid: { span: 3 } }];

	test('in a container narrower than md, the span of 7 is the width of the 4 tracks and nothing passes the edge', async () => {
		const { grid, items, box } = await render({
			query: 'container',
			grid: dense,
			items: spans,
			windowWidth: 1200,
			containerWidth: 360,
		});
		const edge = box(grid).right;
		expect(trackCount(grid)).toBe(4);
		for (const item of items) expect(box(item).right).toBeLessThanOrEqual(edge + 0.5);
		expect(box(items[1] as HTMLElement).width).toBeCloseTo(box(grid).width, 0);
		expect(getComputedStyle(grid).gridAutoFlow).toContain('dense');
	});

	test('the clamp follows the container, not the window: wide container, narrow window', async () => {
		const { grid, items, box } = await render({
			query: 'container',
			grid: dense,
			items: spans,
			windowWidth: 360,
			containerWidth: 960,
		});
		expect(trackCount(grid)).toBe(12);
		expect(box(items[1] as HTMLElement).width).toBeCloseTo((box(grid).width / 12) * 7, 0);
		expect(box(items[0] as HTMLElement).width).toBeCloseTo((box(grid).width / 12) * 2, 0);
	});

	test('the clamp follows the container, not the window: narrow container, wide window', async () => {
		const { grid, items, box } = await render({
			query: 'container',
			grid: dense,
			items: spans,
			windowWidth: 1400,
			containerWidth: 360,
		});
		expect(trackCount(grid)).toBe(4);
		expect(box(items[1] as HTMLElement).width).toBeCloseTo(box(grid).width, 0);
	});

	test.each([
		[360, 4, 4],
		[900, 12, 7],
	])(
		'in media mode, a window %ipx wide has %i tracks and the span of 7 covers %i of them',
		async (width, tracks, covered) => {
			const { grid, items, box } = await render({
				query: 'media',
				grid: dense,
				items: spans,
				windowWidth: width,
			});
			expect(trackCount(grid)).toBe(tracks);
			expect(box(items[1] as HTMLElement).width).toBeCloseTo((box(grid).width / tracks) * covered, 0);
			for (const item of items) expect(box(item).right).toBeLessThanOrEqual(box(grid).right + 0.5);
		},
	);

	test('a span of 2 is half the grid of 4 and a sixth of the grid of 12, at the width the template switches', async () => {
		const narrow = await render({
			query: 'container',
			grid: dense,
			items: [{ grid: { span: 2 } }],
			windowWidth: 1200,
			containerWidth: 700,
		});
		expect(narrow.box(narrow.items[0] as HTMLElement).width).toBeCloseTo(narrow.box(narrow.grid).width / 2, 0);
		const wide = await render({
			query: 'container',
			grid: dense,
			items: [{ grid: { span: 2 } }],
			windowWidth: 1200,
			containerWidth: 768,
		});
		expect(wide.box(wide.items[0] as HTMLElement).width).toBeCloseTo(wide.box(wide.grid).width / 6, 0);
	});

	test('a span set per breakpoint changes with the container', async () => {
		const items: Item[] = [{ grid: { span: 1, responsive: { md: { span: 5 } } } }];
		const narrow = await render({ query: 'container', grid: dense, items, windowWidth: 1200, containerWidth: 360 });
		const wide = await render({ query: 'container', grid: dense, items, windowWidth: 1200, containerWidth: 960 });
		expect(narrow.box(narrow.items[0] as HTMLElement).width).toBeCloseTo(narrow.box(narrow.grid).width / 4, 0);
		expect(wide.box(wide.items[0] as HTMLElement).width).toBeCloseTo((wide.box(wide.grid).width / 12) * 5, 0);
	});
});

describe('a span inside a subgrid clamps to the tracks of the grid around it', () => {
	const parent = { ...NO_GAP, columns: 4, responsive: { md: { columns: 12 } } } as const;
	const subgrid: Item[] = [
		{
			subgrid: [
				{ grid: { span: 7 }, css: ITEM_HEIGHT },
				{ grid: { span: 2 }, css: ITEM_HEIGHT },
			],
		},
	];

	test.each(['container', 'media'] as const)('%s mode: 4 tracks when narrow, 12 when wide', async (query) => {
		const narrow = await render({ query, grid: parent, items: subgrid, windowWidth: 360, containerWidth: 360 });
		const [first] = Array.from(narrow.document.querySelectorAll<HTMLElement>('[data-index]'));
		expect(narrow.box(first as HTMLElement).width).toBeCloseTo(narrow.box(narrow.grid).width, 0);

		const wide = await render({ query, grid: parent, items: subgrid, windowWidth: 960, containerWidth: 960 });
		const [firstWide, second] = Array.from(wide.document.querySelectorAll<HTMLElement>('[data-index]'));
		const track = wide.box(wide.grid).width / 12;
		expect(wide.box(firstWide as HTMLElement).width).toBeCloseTo(track * 7, 0);
		expect(wide.box(second as HTMLElement).width).toBeCloseTo(track * 2, 0);
	});
});

describe('dense packing', () => {
	const items: Item[] = [{ grid: { span: 3 } }, { grid: { span: 3 } }, { grid: { span: 1 } }];

	test('dense backfills the gap in the first row with the smaller item', async () => {
		const { items: placed, box } = await render({
			query: 'container',
			grid: { ...NO_GAP, columns: 4, autoFlow: 'dense' },
			items,
			windowWidth: 800,
		});
		expect(box(placed[2] as HTMLElement).top).toBeCloseTo(box(placed[0] as HTMLElement).top, 0);
		expect(box(placed[1] as HTMLElement).top).toBeGreaterThan(box(placed[0] as HTMLElement).top);
	});

	test('row, the default, keeps source order and leaves the gap', async () => {
		const { items: placed, box } = await render({
			query: 'container',
			grid: { ...NO_GAP, columns: 4 },
			items,
			windowWidth: 800,
		});
		expect(box(placed[2] as HTMLElement).top).toBeGreaterThan(box(placed[0] as HTMLElement).top);
	});
});

describe('named widths keep their layout', () => {
	test('width half is half the grid, on the twelve tracks the grid takes', async () => {
		const { grid, items, box } = await render({
			query: 'media',
			grid: NO_GAP,
			items: [{ grid: { width: 'half' } }, { grid: { width: 'third' } }, { grid: { width: 'quarter' } }],
			windowWidth: 800,
		});
		expect(trackCount(grid)).toBe(12);
		expect(box(items[0] as HTMLElement).width).toBeCloseTo(box(grid).width / 2, 0);
		expect(box(items[1] as HTMLElement).width).toBeCloseTo(box(grid).width / 3, 0);
		expect(box(items[2] as HTMLElement).width).toBeCloseTo(box(grid).width / 4, 0);
	});

	test('a span beside named widths clamps to the twelve tracks', async () => {
		const { grid, items, box } = await render({
			query: 'media',
			grid: NO_GAP,
			items: [{ grid: { width: 'half' } }, { grid: { span: 20 } }],
			windowWidth: 800,
		});
		expect(box(items[1] as HTMLElement).width).toBeCloseTo(box(grid).width, 0);
	});
});

describe('a span in a grid of auto columns', () => {
	test('falls back to one track instead of overflowing, as the validation reports', async () => {
		const { grid, items, box } = await render({
			query: 'media',
			grid: { ...NO_GAP, columns: 'auto', minColumnWidth: '100px' },
			items: [{ grid: { span: 7 } }, { grid: { span: 2 } }],
			windowWidth: 600,
		});
		const [first, second] = items as [HTMLElement, HTMLElement];
		expect(box(first).width).toBeCloseTo(box(second).width, 0);
		expect(box(first).top).toBeCloseTo(box(second).top, 0);
		expect(box(second).right).toBeLessThanOrEqual(box(grid).right + 0.5);
	});
});
