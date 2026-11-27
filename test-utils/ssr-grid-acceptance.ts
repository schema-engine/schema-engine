/**
 * Shared browser assertions for the renderers' SSR grid output.
 *
 * @remarks
 * Both renderers must produce markup that lays out correctly from CSS alone.
 * The harness lives outside either package so the two acceptance tests cannot
 * drift apart; it is imported by relative path because it is test-only.
 */
import { expect } from 'vitest';
import { findSubgridChainBreaks } from '@schema-engine/layout';
import { SSR_SUBGRID_INSET, SSR_SUBGRID_INSET_CSS } from './ssr-grid-fixtures';

/** The part of a compiled layout theme the markup assertions read. */
export interface LayoutThemeLike {
	readonly id: string;
	readonly css: string;
}

/**
 * Inline style attribute of the field host whose label matches, `''` when the
 * renderer emitted none (React drops an empty style object entirely).
 */
function fieldStyle(html: string, label: string): string {
	const host = new RegExp(`<div class="[^"]*\\bse-grid-item\\b[^"]*"[^>]*?>\\s*<label[^>]*>${label}<`).exec(html);
	if (!host) throw new Error(`No .se-grid-item host found for ${label}`);
	return /style="([^"]*)"/.exec(host[0])?.[1] ?? '';
}

/**
 * Asserts the renderer's SSR markup: the compiled stylesheet, the theme-scoped
 * grid container, and field hosts carrying only the breakpoints the author
 * wrote. Runs in Node against the shared acceptance fixture.
 *
 * @remarks
 * The fixture authors `md` only, so `lg` and wider must be absent from the
 * inline style and resolve through the stylesheet's fallback chain instead.
 */
export function expectSsrGridMarkup(html: string, layout: LayoutThemeLike): void {
	expect(html).not.toMatch(/<script\b/i);
	expectNeutralHooksPaired(html);
	expect(html).toContain(layout.css.slice(0, 48));
	expect(html).toContain(`data-se-theme="${layout.id}"`);
	expect(html).toMatch(classToken('se-grid'));
	expect(html).toMatch(classToken('se-grid-item'));

	const tracked = fieldStyle(html, 'Tracked field');
	expect(tracked).toMatch(/--se-item-grid-column:\s*span 1/);
	expect(tracked).toMatch(/--se-item-grid-column-md:\s*span 2/);
	expect(tracked).toMatch(/--se-item-display-md:\s*none/);
	expect(tracked).not.toContain('-lg');
	expect(tracked).not.toContain('-2xl');

	expect(fieldStyle(html, 'Visible field')).toBe('');
}

/** A `class` attribute that lists exactly this class, not a longer class that starts with it. */
function classToken(name: string): RegExp {
	return new RegExp(`class="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"`);
}

/**
 * Asserts every element a renderer marks as a form grid or form field also carries the neutral
 * layout class the stylesheet keys on.
 *
 * @remarks
 * The layout rules select only `.se-grid` and `.se-grid-item`, so a host that keeps the form class
 * and loses the neutral one renders unstyled while every other assertion still finds its siblings.
 */
export function expectNeutralHooksPaired(html: string): void {
	const classes = Array.from(html.matchAll(/class="([^"]*)"/g), (match) => (match[1] ?? '').split(/\s+/));
	const unpaired = (form: string, neutral: string) =>
		classes.filter((tokens) => tokens.includes(form) && !tokens.includes(neutral)).length;
	expect(unpaired('se-form-grid', 'se-grid')).toBe(0);
	expect(unpaired('se-form-field', 'se-grid-item')).toBe(0);
	expect(classes.some((tokens) => tokens.includes('se-form-field'))).toBe(true);
}

/** Every `data-se-theme` value in a document, in order, including repeats. */
function themeIds(html: string): string[] {
	return Array.from(html.matchAll(/data-se-theme="([^"]*)"/g), (match) => match[1] ?? '');
}

/**
 * The stylesheets in a document that carry the layout theme's rules.
 *
 * @remarks
 * Radiant marks its `style` with `data-se-theme-css`. React hoists a stylesheet by its `href` and
 * writes that back as `data-href`, dropping other attributes, so the harness reads that instead.
 */
function themeStylesheets(html: string, layout: LayoutThemeLike): string[] {
	return Array.from(
		html.matchAll(new RegExp(`${themeStylesheetOpening(layout)}([\\s\\S]*?)</style>`, 'g')),
		(match) => match[1] ?? '',
	);
}

/** Pattern for the opening tag of the layout theme's stylesheet, by its marker attribute. */
function themeStylesheetOpening(layout: LayoutThemeLike): string {
	return `<style[^>]*(?:data-se-theme-css="${layout.id}"|data-href="se-layout-theme-${layout.id}")[^>]*>`;
}

/** Each form element of a document, from its opening tag to the start of the next form. */
function formChunks(html: string): string[] {
	return html
		.split(/(?=<(?:form|rui-form)\b[^>]*data-se-theme=)/)
		.filter((chunk) => /^<(?:form|rui-form)\b/.test(chunk));
}

/**
 * Asserts a document of one form: a single theme id on the form, the grid and the items,
 * and one stylesheet for it.
 *
 * @remarks
 * The form element is the element with the `form` tag in React and the `rui-form` host in Radiant,
 * so the assertion reads the first element that carries the id rather than naming either.
 */
export function expectOneThemeOneStylesheet(html: string, layout: LayoutThemeLike): void {
	expect(new Set(themeIds(html))).toEqual(new Set([layout.id]));
	expect(html).toMatch(new RegExp(`<(?:form|rui-form)[^>]*data-se-theme="${layout.id}"`));
	expect(themeStylesheets(html, layout)).toEqual([layout.css]);
	expect(html.match(/<style\b/g)).toHaveLength(1);
	expect(html).not.toContain('data-se-grid-theme');
	expect(html).not.toContain('data-se-appearance-theme');
}

/**
 * Asserts two forms of different engines on one page that share a compiled theme: both carry the
 * same `data-se-theme`, and every copy of the theme's stylesheet equals its `css`.
 *
 * @param html The page holding both forms.
 * @param sharesElement Whether the renderer serves the forms one stylesheet element. React hoists
 * it by `href`, so the page holds exactly one, ahead of the first form. Radiant has no head
 * hoisting, so each form carries its own self-contained copy and stays styled whatever the render
 * order, streaming, caching or removal of the other forms.
 */
export function expectSharedLayoutTheme(html: string, layout: LayoutThemeLike, sharesElement: boolean): void {
	expect(new Set(themeIds(html))).toEqual(new Set([layout.id]));
	const forms = formChunks(html);
	expect(forms.length).toBeGreaterThan(1);
	if (sharesElement) {
		expect(themeStylesheets(html, layout)).toEqual([layout.css]);
		expect(html.search(new RegExp(themeStylesheetOpening(layout)))).toBeLessThan(html.indexOf(forms[0] ?? ''));
		return;
	}
	for (const form of forms) expect(themeStylesheets(form, layout)).toEqual([layout.css]);
}

async function waitForFrameLayout(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
	});
}

export async function loadSsrFrame(html: string, width: number): Promise<{ frame: HTMLIFrameElement; doc: Document }> {
	const frame = document.createElement('iframe');
	frame.title = 'SSR grid acceptance';
	frame.setAttribute('sandbox', 'allow-same-origin');
	frame.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:800px;border:0;background:#fff;`;
	const loaded = new Promise<void>((resolve, reject) => {
		frame.addEventListener('load', () => resolve(), { once: true });
		frame.addEventListener('error', () => reject(new Error('SSR iframe failed to load')), { once: true });
	});
	frame.srcdoc = html;
	document.body.append(frame);
	await loaded;
	const doc = frame.contentDocument;
	if (!doc) {
		frame.remove();
		throw new Error('Expected the SSR iframe to expose a document');
	}
	await waitForFrameLayout();
	return { frame, doc };
}

export function fieldHost(doc: Document, label: RegExp): HTMLElement {
	const matches = Array.from(doc.querySelectorAll<HTMLElement>('.se-grid-item')).filter((node) =>
		label.test(node.textContent ?? ''),
	);
	const innermost = matches.find((node) => !matches.some((other) => other !== node && node.contains(other)));
	if (!innermost) {
		throw new Error(`Expected a .se-grid-item host for ${label}`);
	}
	return innermost;
}

/**
 * Asserts the SSR document lays out responsively with no application JavaScript.
 *
 * @param html Server-rendered document for the shared acceptance fixture: a
 * one-column grid that becomes two columns at `sm`, whose `tracked` field spans
 * two columns and hides from `md` up.
 */
export async function expectSsrGridAcceptance(html: string, layout: LayoutThemeLike): Promise<void> {
	expect(html).not.toMatch(/<script\b/i);
	expectNeutralHooksPaired(html);
	expect(html).toContain(layout.css.slice(0, 48));
	expect(html).toContain(`data-se-theme="${layout.id}"`);
	expect(html).toMatch(classToken('se-grid'));
	expect(html).toMatch(classToken('se-grid-item'));

	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const style = doc.querySelector('style[data-se-theme-css]') ?? doc.querySelector('style');
		expect(style?.textContent).toContain(layout.css.slice(0, 48));

		const grid = doc.querySelector<HTMLElement>('.se-grid[data-se-theme]');
		expect(grid).toBeTruthy();
		expect(getComputedStyle(grid!).gridTemplateColumns.split(' ').length).toBe(1);
		expect(getComputedStyle(fieldHost(doc, /tracked field/i)).display).not.toBe('none');

		frame.style.width = '1280px';
		await waitForFrameLayout();
		const hiddenHost = fieldHost(doc, /tracked field/i);
		expect(getComputedStyle(grid!).gridTemplateColumns.split(' ').length).toBe(2);
		expect(getComputedStyle(hiddenHost).display).toBe('none');
		expect(getComputedStyle(hiddenHost).gridColumn).toBe('span 2');
	} finally {
		frame.remove();
	}
}

function near(actual: number, expected: number): void {
	expect(Math.abs(actual - expected)).toBeLessThan(1);
}

/**
 * Asserts the named width layout of the SSR document at a narrow and a wide
 * viewport, from CSS alone.
 *
 * @param html Server-rendered document for a form built from `SSR_WIDTH_FIELDS` (`ssr-grid-fixtures.ts`).
 */
export async function expectSsrWidthsAcceptance(html: string, layout: LayoutThemeLike): Promise<void> {
	expect(html).not.toMatch(/<script\b/i);
	expect(html).toContain(layout.css.slice(0, 48));

	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const grid = doc.querySelector<HTMLElement>('.se-grid[data-se-theme]');
		expect(grid).toBeTruthy();
		const rect = (label: RegExp) => fieldHost(doc, label).getBoundingClientRect();
		const measure = () => {
			const bounds = grid!.getBoundingClientRect();
			const gap = Number.parseFloat(getComputedStyle(grid!).columnGap);
			const track = (bounds.width - 11 * gap) / 12;
			return { bounds, gap, span: (count: number) => count * track + (count - 1) * gap };
		};

		for (const width of [375, 1280]) {
			frame.style.width = `${width}px`;
			await waitForFrameLayout();
			const { bounds, gap, span } = measure();
			expect(getComputedStyle(grid!).gridTemplateColumns.split(' ').length).toBe(12);

			const halfA = rect(/half a/i);
			const halfB = rect(/half b/i);
			near(halfA.top, halfB.top);
			near(halfA.width, span(6));
			near(halfB.width, span(6));
			near(halfB.left - halfA.left, span(6) + gap);

			const centred = rect(/centred/i);
			near(centred.width, span(6));
			near(centred.left - bounds.left, bounds.right - centred.right);

			near(rect(/plain/i).width, bounds.width);

			near(rect(/raw span/i).width, span(2));
			const rawLines = rect(/raw lines/i);
			expect(getComputedStyle(fieldHost(doc, /raw lines/i)).gridColumn).toBe('4 / 10');
			near(rawLines.width, span(6));
			near(rawLines.left - bounds.left, span(3) + gap);
		}

		frame.style.width = '375px';
		await waitForFrameLayout();
		near(rect(/responsive/i).width, measure().bounds.width);

		frame.style.width = '1280px';
		await waitForFrameLayout();
		near(rect(/responsive/i).width, measure().span(4));
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a container lays its children out on its own twelve tracks:
 * two halves share a row and a sibling with no width fills the next one.
 *
 * @param html Server-rendered document holding, for each of `groups`, a container
 * whose children are `ssrNestedFields` (`ssr-grid-fixtures.ts`) with that prefix: a fieldset for
 * `'Nest'` and an array row for `'Row'`.
 */
export async function expectSsrNestedWidthsAcceptance(
	html: string,
	layout: LayoutThemeLike,
	groups: readonly ('Nest' | 'Row')[],
): Promise<void> {
	expectNeutralHooksPaired(html);
	expect(html).toContain(layout.css.slice(0, 48));

	const { frame, doc } = await loadSsrFrame(html, 800);
	try {
		for (const group of groups) {
			const first = fieldHost(doc, new RegExp(`${group} A`));
			const grid = first.parentElement?.closest<HTMLElement>('.se-grid[data-se-theme]');
			expect(grid, `${group} children sit in their own grid`).toBeTruthy();
			expect(grid).not.toBe(doc.querySelector('.se-grid[data-se-theme]'));
			expect(getComputedStyle(grid!).gridTemplateColumns.split(' ').length).toBe(12);

			const bounds = grid!.getBoundingClientRect();
			const gap = Number.parseFloat(getComputedStyle(grid!).columnGap);
			const half = ((bounds.width - 11 * gap) / 12) * 6 + 5 * gap;
			const a = first.getBoundingClientRect();
			const b = fieldHost(doc, new RegExp(`${group} B`)).getBoundingClientRect();
			const plain = fieldHost(doc, new RegExp(`${group} plain`)).getBoundingClientRect();
			near(a.top, b.top);
			near(a.width, half);
			near(b.width, half);
			near(b.left - a.left, half + gap);
			expect(plain.top).toBeGreaterThan(a.bottom - 1);
			near(plain.width, bounds.width);
		}
	} finally {
		frame.remove();
	}
}

/** The grid container that holds a field host. */
function gridOf(doc: Document, label: RegExp): HTMLElement {
	const grid = fieldHost(doc, label).parentElement?.closest<HTMLElement>('.se-grid[data-se-theme]');
	if (!grid) throw new Error(`Expected ${label} to sit in a grid`);
	return grid;
}

/**
 * Asserts the SSR markup of the drawn layout: the template and each area travel
 * as custom properties, and the field carries no CSS the author did not write.
 *
 * @param html Server-rendered document for `ssrAreasForm` (`ssr-grid-fixtures.ts`).
 */
export function expectSsrAreasMarkup(html: string): void {
	const grid = /<div[^>]*class="(?:[^"]*\s)?se-grid(?:\s[^"]*)?"[^>]*>/.exec(html)?.[0] ?? '';
	const decoded = grid.replaceAll(/&quot;|&#34;|&#x22;/g, '"');
	expect(decoded).toMatch(/--se-grid-areas:\s*"a a a b b b" "a a a c c c" "d d e e e e"/);
	expect(decoded).toMatch(/--se-grid-template:\s*repeat\(6, minmax\(0, 1fr\)\)/);
	const field = fieldStyle(html, 'Area A');
	expect(field).toMatch(/--se-item-grid-column:\s*a/);
	expect(field).toMatch(/--se-item-grid-row:\s*a/);
	expect(field).not.toContain('grid-area');
}

/**
 * Asserts that a drawn layout places fields from CSS alone: `a` spans three
 * columns and two rows, `b` and `c` stack beside it, and `d` and `e` share the
 * last row at two and four columns wide.
 *
 * @param html Server-rendered document for `ssrAreasForm` (`ssr-grid-fixtures.ts`).
 */
export async function expectSsrAreasAcceptance(html: string, layout: LayoutThemeLike): Promise<void> {
	expect(html).not.toMatch(/<script\b/i);
	expect(html).toContain(layout.css.slice(0, 48));

	const { frame, doc } = await loadSsrFrame(html, 800);
	try {
		const grid = gridOf(doc, /Area A/);
		expect(getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(6);
		const bounds = grid.getBoundingClientRect();
		const gap = Number.parseFloat(getComputedStyle(grid).columnGap);
		const rowGap = Number.parseFloat(getComputedStyle(grid).rowGap);
		const span = (count: number) => (count * (bounds.width - 5 * gap)) / 6 + (count - 1) * gap;
		const rect = (label: RegExp) => fieldHost(doc, label).getBoundingClientRect();
		const [a, b, c, d, e] = [/Area A/, /Area B/, /Area C/, /Area D/, /Area E/].map(rect) as [
			DOMRect,
			DOMRect,
			DOMRect,
			DOMRect,
			DOMRect,
		];

		near(a.left, bounds.left);
		near(a.width, span(3));
		near(a.top, b.top);
		near(a.height, b.height + rowGap + c.height);
		near(a.bottom, c.bottom);

		near(b.left - a.left, span(3) + gap);
		near(b.width, span(3));
		near(c.left, b.left);
		near(c.width, span(3));
		expect(c.top).toBeGreaterThan(b.bottom - 1);

		near(d.left, bounds.left);
		near(d.width, span(2));
		near(e.left - d.left, span(2) + gap);
		near(e.width, span(4));
		near(d.top, e.top);
		expect(d.top).toBeGreaterThan(a.bottom - 1);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a step draws its own template by breakpoint while another step
 * keeps the form's two columns: the address fields stack until `md` and then
 * share a row, and the other step's fields sit side by side at both widths.
 *
 * @param html Server-rendered document for `ssrSteppedForm` (`ssr-grid-fixtures.ts`).
 */
export async function expectSsrSteppedAcceptance(html: string, layout: LayoutThemeLike): Promise<void> {
	expect(html).toContain(layout.css.slice(0, 48));

	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const addressGrid = gridOf(doc, /Street/);
		const otherGrid = gridOf(doc, /Other A/);
		expect(addressGrid).not.toBe(otherGrid);
		const rect = (label: RegExp) => fieldHost(doc, label).getBoundingClientRect();
		const columns = (grid: HTMLElement) => getComputedStyle(grid).gridTemplateColumns.split(' ').length;

		for (const width of [375, 1280]) {
			frame.style.width = `${width}px`;
			await waitForFrameLayout();
			expect(columns(otherGrid)).toBe(2);
			near(rect(/Other A/).top, rect(/Other B/).top);
			expect(rect(/Other B/).left).toBeGreaterThan(rect(/Other A/).right - 1);
		}

		frame.style.width = '375px';
		await waitForFrameLayout();
		expect(columns(addressGrid)).toBe(1);
		const [street, city, zip] = [/Street/, /City/, /Zip/].map(rect) as [DOMRect, DOMRect, DOMRect];
		near(city.left, street.left);
		near(zip.left, street.left);
		expect(city.top).toBeGreaterThan(street.bottom - 1);
		expect(zip.top).toBeGreaterThan(city.bottom - 1);

		frame.style.width = '1280px';
		await waitForFrameLayout();
		expect(columns(addressGrid)).toBe(2);
		const wide = { street: rect(/Street/), city: rect(/City/), zip: rect(/Zip/) };
		const bounds = addressGrid.getBoundingClientRect();
		const gap = Number.parseFloat(getComputedStyle(addressGrid).columnGap);
		near(wide.street.width, bounds.width);
		near(wide.city.top, wide.zip.top);
		expect(wide.city.top).toBeGreaterThan(wide.street.bottom - 1);
		near(wide.city.width, (bounds.width - gap) / 2);
		near(wide.zip.left - wide.city.left, (bounds.width - gap) / 2 + gap);
	} finally {
		frame.remove();
	}
}

/** Opening tags of the elements that carry a class, among the class tokens of their `class` attribute. */
function elementsWithClass(html: string, name: string): string[] {
	return html.match(new RegExp(`<[a-z][^>]*class="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"[^>]*>`, 'g')) ?? [];
}

/**
 * Asserts a query container directly around every grid of a document, and none anywhere else.
 *
 * @param grids How many grids the document holds: a step's, and each fieldset's and array row's.
 * @remarks
 * Each wrapper must carry the theme id and open right before its grid, since an ancestor that is
 * not the grid's own wrapper would make the template and the items query different boxes.
 */
export function expectGridContainers(html: string, layout: LayoutThemeLike, grids: number): void {
	expect(elementsWithClass(html, 'se-grid')).toHaveLength(grids);
	const containers = elementsWithClass(html, 'se-grid-container');
	expect(containers).toHaveLength(grids);
	for (const container of containers) expect(container).toContain(`data-se-theme="${layout.id}"`);
	const wrapped = html.match(
		/<[a-z][^>]*class="se-grid-container"[^>]*>\s*<[a-z][^>]*class="(?:[^"]*\s)?se-grid(?:\s[^"]*)?"/g,
	);
	expect(wrapped).toHaveLength(grids);
}

/** Asserts a document that has no query container and no rule for one, as a theme that queries the viewport renders. */
export function expectNoGridContainers(html: string, layout: LayoutThemeLike): void {
	expect(html).not.toContain('se-grid-container');
	expect(html).not.toContain('@container');
	expect(html).toContain('@media (min-width:');
	expect(html).toContain(layout.css.slice(0, 48));
}

/**
 * Asserts that a grid measures its container and not the window, at one window width and the other.
 *
 * @param html Server-rendered document for `ssrContainerForm` (`ssr-grid-fixtures.ts`) on
 * `SSR_CONTAINER_LAYOUT`: one column, and two from `md` (48rem) with the default gap growing there.
 * @remarks
 * Resizes the element that holds the form, never the window: a wide window with a narrow container
 * must lay out narrow, and a narrow window with a wide container wide.
 */
export async function expectSsrContainerAcceptance(html: string, layout: LayoutThemeLike): Promise<void> {
	expect(html).not.toMatch(/<script\b/i);
	expect(html).toContain(layout.css.slice(0, 48));
	expect(html).toContain('@container se-grid (min-width:48rem)');
	expect(html).toContain(`data-se-theme="${layout.id}"`);
	const hosted = html
		.replace('<body>', '<body><div id="se-test-host" style="width:300px">')
		.replace('</body>', '</div></body>');

	const { frame, doc } = await loadSsrFrame(hosted, 375);
	try {
		const host = doc.getElementById('se-test-host');
		const grid = doc.querySelector<HTMLElement>('.se-grid[data-se-theme]');
		if (!host || !grid) throw new Error('Expected the container host and the grid');
		const spanning = fieldHost(doc, /spanning field/i);
		const plain = fieldHost(doc, /plain field/i);
		const columns = () => getComputedStyle(grid).gridTemplateColumns.split(' ').length;
		const layoutAt = async (viewport: number, container: number) => {
			frame.style.width = `${viewport}px`;
			host.style.width = `${container}px`;
			await waitForFrameLayout();
		};
		const expectNarrow = () => {
			expect(columns()).toBe(1);
			expect(getComputedStyle(spanning).gridColumn).toBe('span 1');
			near(Number.parseFloat(getComputedStyle(grid).columnGap), 16);
			near(spanning.getBoundingClientRect().width, grid.getBoundingClientRect().width);
			expect(plain.getBoundingClientRect().top).toBeGreaterThan(spanning.getBoundingClientRect().bottom - 1);
		};
		const expectWide = () => {
			expect(columns()).toBe(2);
			expect(getComputedStyle(spanning).gridColumn).toBe('span 2');
			near(Number.parseFloat(getComputedStyle(grid).columnGap), 32);
			near(spanning.getBoundingClientRect().width, grid.getBoundingClientRect().width);
			expect(plain.getBoundingClientRect().top).toBeGreaterThan(spanning.getBoundingClientRect().bottom - 1);
		};

		await layoutAt(1400, 300);
		expectNarrow();

		await layoutAt(375, 900);
		expectWide();

		await layoutAt(1400, 900);
		expectWide();

		await layoutAt(375, 300);
		expectNarrow();
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a grid inside a narrow container keeps its own layout when the grid around it is wide.
 *
 * @param html Server-rendered document for `ssrNestedContainerForm` (`ssr-grid-fixtures.ts`) on
 * `SSR_CONTAINER_LAYOUT`, of either variant.
 * @remarks
 * Both grids use the same breakpoint names, and the inner grid's container is below `md` while the outer's
 * is above it. A responsive value that the outer grid or its fieldset resolved at `md` must not reach the
 * inner grid, which draws twelve tracks and lays its children out full width.
 */
export async function expectSsrNestedContainerAcceptance(html: string, layout: LayoutThemeLike): Promise<void> {
	expect(html).toContain(layout.css.slice(0, 48));
	expect(html).toContain('@container se-grid (min-width:48rem)');
	const hosted = html
		.replace('<body>', '<body><div id="se-test-host" style="width:900px">')
		.replace('</body>', '</div></body>');

	const { frame, doc } = await loadSsrFrame(hosted, 1400);
	try {
		const outer = doc.querySelector<HTMLElement>('.se-grid[data-se-theme]');
		const first = fieldHost(doc, /Nest A/);
		const inner = first.parentElement?.closest<HTMLElement>('.se-grid[data-se-theme]');
		if (!outer || !inner || outer === inner) throw new Error('Expected a step grid and the fieldset grid in it');

		expect(getComputedStyle(outer).gridTemplateColumns.split(' '), 'the outer container is above md').toHaveLength(
			3,
		);
		expect(inner.parentElement?.getBoundingClientRect().width, 'the inner container is below md').toBeLessThan(768);
		const style = getComputedStyle(inner);
		const track = Number.parseFloat(style.gridTemplateColumns.split(' ')[0] ?? '0');
		const gap = Number.parseFloat(style.columnGap);
		near(gap, 16);
		near(track, (inner.getBoundingClientRect().width - 11 * gap) / 12);
		near(first.getBoundingClientRect().width, inner.getBoundingClientRect().width);
		expect(fieldHost(doc, /Nest B/).getBoundingClientRect().top).toBeGreaterThan(
			first.getBoundingClientRect().bottom - 1,
		);
	} finally {
		frame.remove();
	}
}

/** Edges of two boxes are the same line when they are within half a pixel. */
export function aligned(actual: number, expected: number): void {
	expect(Math.abs(actual - expected)).toBeLessThan(0.5);
}

export function boxOf(doc: Document, label: RegExp): DOMRect {
	return fieldHost(doc, label).getBoundingClientRect();
}

/**
 * Space between the tracks a field is placed on and the edge of its box, on one side: the padding and
 * border of every box of the subgrid chain around it.
 *
 * @remarks
 * Interior lines of a subgrid are the parent's exactly, but its padding and border are added to the
 * items in its edge tracks as margin, so the first and last columns are inset by that much.
 */
export function trackInset(host: HTMLElement, side: 'Left' | 'Right'): number {
	let inset = 0;
	for (
		let node = host.parentElement;
		node && !(node.classList.contains('se-grid') && !node.classList.contains('se-subgrid'));
		node = node.parentElement
	) {
		const style = getComputedStyle(node);
		inset += Number.parseFloat(style[`padding${side}`]) + Number.parseFloat(style[`border${side}Width`]);
	}
	return inset;
}

/** The grid that lays out a field, which must be a subgrid taking `tracks` tracks from the grid around it. */
export function expectSubgridOf(doc: Document, label: RegExp, tracks: number): HTMLElement {
	const grid = fieldHost(doc, label).parentElement?.closest<HTMLElement>('.se-grid[data-se-theme]');
	if (!grid) throw new Error(`Expected ${label} to sit in a grid`);
	expect(grid.classList.contains('se-subgrid'), `${label} sits in a subgrid`).toBe(true);
	const [keyword, ...lines] = getComputedStyle(grid).gridTemplateColumns.split(' ');
	expect(keyword, `${label} takes its parent's tracks`).toBe('subgrid');
	expect(lines, `${label} sees the parent's lines`).toHaveLength(tracks + 1);
	return grid;
}

/** The step's own grid: the one grid of the document that is not a subgrid and not inside one. */
function stepGridOf(doc: Document): HTMLElement {
	const grid = doc.querySelector<HTMLElement>('.se-grid[data-se-theme]:not(.se-subgrid)');
	if (!grid) throw new Error('Expected the step grid');
	return grid;
}

/** Left and right inset of a field's tracks, and its box. */
function placement(doc: Document, label: RegExp) {
	const host = fieldHost(doc, label);
	return {
		box: host.getBoundingClientRect(),
		left: trackInset(host, 'Left'),
		right: trackInset(host, 'Right'),
	};
}

/**
 * Asserts the class chain of a subgrid in markup: the item carries `se-subgrid` and the `1 / -1` placement,
 * the inner grid carries it beside `se-grid`, and no query container sits between them.
 *
 * @param html Server-rendered document of the `widths` variant.
 * @param container Whether the theme queries its container, which then wraps the step's grid and no subgrid.
 */
export function expectSubgridMarkup(html: string, container: boolean): void {
	expect(elementsWithClass(html, 'se-grid')).toHaveLength(2);
	const inner = elementsWithClass(html, 'se-grid').filter((tag) => /\bse-subgrid\b/.test(tag));
	expect(inner, 'the inner grid carries the subgrid class').toHaveLength(1);
	expect(inner[0]).toContain('data-se-theme=');
	expect(inner[0]).not.toContain('style=');
	const items = elementsWithClass(html, 'se-grid-item').filter((tag) => /\bse-subgrid\b/.test(tag));
	expect(items, 'the fieldset item carries the subgrid class').toHaveLength(1);
	expect(items[0]).toMatch(/--se-item-grid-column:\s*1 \/ -1/);
	expect(elementsWithClass(html, 'se-grid-container')).toHaveLength(container ? 1 : 0);
	const fromItem = html.slice(html.indexOf(items[0] ?? ''));
	expect(fromItem).not.toContain('se-grid-container');
}

/**
 * Asserts that the fields of a subgrid fieldset line up with the width grid around it, at one wide viewport.
 *
 * @param html Server-rendered document of the `widths` variant: two halves, then a subgrid fieldset of two
 * halves and a field with no width.
 */
export async function expectSsrSubgridWidthsAcceptance(html: string): Promise<void> {
	expectNeutralHooksPaired(html);
	const { frame, doc } = await loadSsrFrame(html, 1000);
	try {
		expectSubgridOf(doc, /Street/, 12);
		const first = boxOf(doc, /First/);
		const last = boxOf(doc, /Last/);
		const street = placement(doc, /Street/);
		const city = placement(doc, /City/);
		const notes = placement(doc, /Notes/);
		aligned(street.box.left, first.left + street.left);
		aligned(street.box.right, first.right);
		aligned(city.box.left, last.left);
		aligned(city.box.right, last.right - city.right);
		aligned(street.box.top, city.box.top);
		aligned(notes.box.left, first.left + notes.left);
		aligned(notes.box.right, last.right - notes.right);
		expect(notes.box.top).toBeGreaterThan(street.box.bottom - 1);
		expect(getComputedStyle(fieldHost(doc, /Address/)).display).toBe('grid');
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that widths only a subgrid sets still give the step twelve tracks.
 *
 * @param html Server-rendered document of the `through` variant.
 */
export async function expectSsrSubgridThroughAcceptance(html: string): Promise<void> {
	const { frame, doc } = await loadSsrFrame(html, 1000);
	try {
		const step = stepGridOf(doc);
		expect(getComputedStyle(step).gridTemplateColumns.split(' ')).toHaveLength(12);
		expectSubgridOf(doc, /Street/, 12);
		const bounds = step.getBoundingClientRect();
		const gap = Number.parseFloat(getComputedStyle(step).columnGap);
		const street = placement(doc, /Street/);
		const city = placement(doc, /City/);
		const half = ((bounds.width - 11 * gap) / 12) * 6 + 5 * gap;
		aligned(street.box.top, city.box.top);
		aligned(street.box.width, half - street.left);
		aligned(city.box.width, half - city.right);
		aligned(city.box.left - street.box.left, street.box.width + street.left + gap);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a subgrid of a columns grid places its children on the parent's columns, shares its gap, and is
 * inset by its own padding and border on the outer sides only.
 *
 * @param html Server-rendered document of the `columns` variant, without the inset rule.
 */
export async function expectSsrSubgridColumnsAcceptance(html: string): Promise<void> {
	const padded = html.replace('<body>', `<body><style>${SSR_SUBGRID_INSET_CSS}</style>`);
	const { frame, doc } = await loadSsrFrame(padded, 1000);
	try {
		const step = stepGridOf(doc);
		expectSubgridOf(doc, /Col C/, 2);
		const a = boxOf(doc, /Col A/);
		const b = boxOf(doc, /Col B/);
		const c = placement(doc, /Col C/);
		const d = placement(doc, /Col D/);
		expect(c.left).toBe(SSR_SUBGRID_INSET);
		expect(d.right).toBe(SSR_SUBGRID_INSET);
		aligned(c.box.left, a.left + SSR_SUBGRID_INSET);
		aligned(c.box.right, a.right);
		aligned(d.box.left, b.left);
		aligned(d.box.right, b.right - SSR_SUBGRID_INSET);
		const gap = Number.parseFloat(getComputedStyle(step).columnGap);
		expect(gap).toBeGreaterThan(16);
		aligned(d.box.left - c.box.right, gap);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that the fields of a subgrid follow the responsive tracks of the grid around it.
 *
 * @param html Server-rendered document of the `responsive` variant, on a theme that queries the window.
 */
export async function expectSsrSubgridResponsiveAcceptance(html: string): Promise<void> {
	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const first = () => boxOf(doc, /First/);
		const last = () => boxOf(doc, /Last/);
		const street = () => placement(doc, /Street/);
		const city = () => placement(doc, /City/);

		expectSubgridOf(doc, /Street/, 12);
		aligned(street().box.left, first().left + street().left);
		aligned(street().box.right, first().right - street().right);
		aligned(city().box.left, street().box.left);
		expect(city().box.top).toBeGreaterThan(street().box.bottom - 1);

		frame.style.width = '1280px';
		await waitForFrameLayout();
		aligned(street().box.right, first().right);
		aligned(city().box.left, last().left);
		aligned(street().box.top, city().box.top);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a subgrid fieldset hidden from `md` is shown below it, as a grid, and not displayed from it.
 *
 * @param html Server-rendered document of the `hidden` variant.
 */
export async function expectSsrSubgridHiddenAcceptance(html: string): Promise<void> {
	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const fieldset = fieldHost(doc, /Address/);
		expect(getComputedStyle(fieldset).display).toBe('grid');
		frame.style.width = '1280px';
		await waitForFrameLayout();
		expect(getComputedStyle(fieldset).display).toBe('none');
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that every subgrid of a rendered form has an unbroken chain of `se-subgrid` boxes up to its grid.
 *
 * @param html Server-rendered document that holds at least one subgrid.
 */
export async function expectSsrSubgridChainAcceptance(html: string): Promise<void> {
	const { frame, doc } = await loadSsrFrame(html, 1000);
	try {
		expect(doc.querySelectorAll('.se-subgrid').length, 'the document holds a subgrid to check').toBeGreaterThan(0);
		expect(findSubgridChainBreaks(doc).map((entry) => entry.description)).toEqual([]);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that subgrids nest: the innermost fields sit on the step's tracks.
 *
 * @param html Server-rendered document of the `nested` variant.
 */
export async function expectSsrSubgridNestedAcceptance(html: string): Promise<void> {
	const { frame, doc } = await loadSsrFrame(html, 1000);
	try {
		expectSubgridOf(doc, /Street/, 12);
		const first = boxOf(doc, /First/);
		const last = boxOf(doc, /Last/);
		const street = placement(doc, /Street/);
		const city = placement(doc, /City/);
		aligned(street.box.left, first.left + street.left);
		aligned(street.box.right, first.right);
		aligned(city.box.left, last.left);
		aligned(city.box.right, last.right - city.right);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a subgrid follows the width of its parent's container, and not the window or a container of its own.
 *
 * @param html Server-rendered document of the `container` variant on a `query: 'container'` theme.
 * @remarks
 * The window stays wider than `xl` and the element that holds the form is resized, below `md` and above it.
 */
export async function expectSsrSubgridContainerAcceptance(html: string): Promise<void> {
	expectSubgridMarkup(html, true);
	const hosted = html
		.replace('<body>', '<body><div id="se-test-host" style="width:600px">')
		.replace('</body>', '</div></body>');
	const { frame, doc } = await loadSsrFrame(hosted, 1400);
	try {
		const host = doc.getElementById('se-test-host');
		if (!host) throw new Error('Expected the container host');
		const address = fieldHost(doc, /Address/);
		expect(address.querySelector('.se-grid-container'), 'no query container inside the subgrid').toBeNull();
		expect(doc.querySelectorAll('.se-grid-container')).toHaveLength(1);
		expectSubgridOf(doc, /Street/, 12);
		const first = () => boxOf(doc, /First/);
		const last = () => boxOf(doc, /Last/);
		const street = () => placement(doc, /Street/);
		const city = () => placement(doc, /City/);

		aligned(street().box.left, first().left + street().left);
		aligned(street().box.right, first().right - street().right);
		expect(city().box.top, 'below md the fields are stacked').toBeGreaterThan(street().box.bottom - 1);

		host.style.width = '900px';
		await waitForFrameLayout();
		aligned(street().box.right, first().right);
		aligned(city().box.left, last().left);
		aligned(street().box.top, city().box.top);
	} finally {
		frame.remove();
	}
}
