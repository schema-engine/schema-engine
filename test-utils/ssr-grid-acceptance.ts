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
	const match = Array.from(doc.querySelectorAll<HTMLElement>('.se-form-field')).find((node) =>
		label.test(node.textContent ?? ''),
	);
	if (!match) {
		throw new Error(`Expected a .se-form-field host for ${label}`);
	}
	return match;
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
