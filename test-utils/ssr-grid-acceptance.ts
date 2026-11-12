/**
 * Shared browser assertions for the renderers' SSR grid output.
 *
 * @remarks
 * Both renderers must produce markup that lays out correctly from CSS alone.
 * The harness lives outside either package so the two acceptance tests cannot
 * drift apart; it is imported by relative path because it is test-only.
 */
import { expect } from 'vitest';

export interface CompiledGridLike {
	readonly theme: { readonly id: string };
	readonly css: string;
}

/**
 * Inline style attribute of the field host whose label matches, `''` when the
 * renderer emitted none (React drops an empty style object entirely).
 */
function fieldStyle(html: string, label: string): string {
	const host = new RegExp(`<div class="se-form-field"[^>]*?>\\s*<label[^>]*>${label}<`).exec(html);
	if (!host) throw new Error(`No .se-form-field host found for ${label}`);
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
export function expectSsrGridMarkup(html: string, compiled: CompiledGridLike): void {
	expect(html).not.toMatch(/<script\b/i);
	expect(html).toContain(compiled.css.slice(0, 48));
	expect(html).toContain(`data-se-grid-theme="${compiled.theme.id}"`);
	expect(html).toContain('se-form-grid');
	expect(html).toContain('se-form-field');

	const tracked = fieldStyle(html, 'Tracked field');
	expect(tracked).toMatch(/--se-field-grid-column:\s*span 1/);
	expect(tracked).toMatch(/--se-field-grid-column-md:\s*span 2/);
	expect(tracked).toMatch(/--se-field-display-md:\s*none/);
	expect(tracked).not.toContain('-lg');
	expect(tracked).not.toContain('-2xl');

	expect(fieldStyle(html, 'Visible field')).toBe('');
}

async function waitForFrameLayout(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
	});
}

async function loadSsrFrame(html: string, width: number): Promise<{ frame: HTMLIFrameElement; doc: Document }> {
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

function fieldHost(doc: Document, label: RegExp): HTMLElement {
	const matches = Array.from(doc.querySelectorAll<HTMLElement>('.se-form-field')).filter((node) =>
		label.test(node.textContent ?? ''),
	);
	const innermost = matches.find((node) => !matches.some((other) => other !== node && node.contains(other)));
	if (!innermost) {
		throw new Error(`Expected a .se-form-field host for ${label}`);
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
export async function expectSsrGridAcceptance(html: string, compiled: CompiledGridLike): Promise<void> {
	expect(html).not.toMatch(/<script\b/i);
	expect(html).toContain(compiled.css.slice(0, 48));
	expect(html).toContain(`data-se-grid-theme="${compiled.theme.id}"`);
	expect(html).toContain('se-form-grid');
	expect(html).toContain('se-form-field');

	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const style = doc.querySelector('style[data-se-grid-theme]') ?? doc.querySelector('style');
		expect(style?.textContent).toContain(compiled.css.slice(0, 48));

		const grid = doc.querySelector<HTMLElement>('.se-form-grid[data-se-grid-theme]');
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

function near(actual: number, expected: number): void {
	expect(Math.abs(actual - expected)).toBeLessThan(1);
}

/**
 * Asserts the named width layout of the SSR document at a narrow and a wide
 * viewport, from CSS alone.
 *
 * @param html Server-rendered document for a form built from {@link SSR_WIDTH_FIELDS}.
 */
export async function expectSsrWidthsAcceptance(html: string, compiled: CompiledGridLike): Promise<void> {
	expect(html).not.toMatch(/<script\b/i);
	expect(html).toContain(compiled.css.slice(0, 48));

	const { frame, doc } = await loadSsrFrame(html, 375);
	try {
		const grid = doc.querySelector<HTMLElement>('.se-form-grid[data-se-grid-theme]');
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

/**
 * Asserts that a container lays its children out on its own twelve tracks:
 * two halves share a row and a sibling with no width fills the next one.
 *
 * @param html Server-rendered document holding, for each of `groups`, a container
 * whose children are {@link ssrNestedFields} with that prefix: a fieldset for
 * `'Nest'` and an array row for `'Row'`.
 */
export async function expectSsrNestedWidthsAcceptance(
	html: string,
	compiled: CompiledGridLike,
	groups: readonly ('Nest' | 'Row')[],
): Promise<void> {
	expect(html).toContain(compiled.css.slice(0, 48));

	const { frame, doc } = await loadSsrFrame(html, 800);
	try {
		for (const group of groups) {
			const first = fieldHost(doc, new RegExp(`${group} A`));
			const grid = first.parentElement?.closest<HTMLElement>('.se-form-grid[data-se-grid-theme]');
			expect(grid, `${group} children sit in their own grid`).toBeTruthy();
			expect(grid).not.toBe(doc.querySelector('.se-form-grid[data-se-grid-theme]'));
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
