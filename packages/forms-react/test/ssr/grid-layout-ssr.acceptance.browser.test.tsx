import { describe, expect, test } from 'vitest';
import { getSsrAcceptanceEngine, renderSsrLayoutAcceptanceHtml } from './render-form-ssr-html';

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

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		const html = renderSsrLayoutAcceptanceHtml();
		const engine = getSsrAcceptanceEngine();
		const compiled = engine.getCompiledGrid();
		expect(html).not.toMatch(/<script\b/i);
		expect(html).toContain(compiled.css.slice(0, 48));
		expect(html).toContain('se-form-field');
		expect(html).toContain('--se-field-grid-column-lg:span 2');
		expect(html).toContain('--se-field-display-lg:none');

		const { frame, doc } = await loadSsrFrame(html, 375);
		try {
			const style = doc.querySelector('style[data-se-grid-theme]') ?? doc.querySelector('style');
			expect(style).toBeTruthy();
			expect(style!.textContent).toContain(compiled.css.slice(0, 48));
			const grid = doc.querySelector<HTMLElement>('.se-form-grid[data-se-grid-theme]');
			expect(grid).toBeTruthy();
			expect(getComputedStyle(grid!).gridTemplateColumns.split(' ').length).toBe(1);

			frame.style.width = '1280px';
			await waitForFrameLayout();
			const hiddenHost = fieldHost(doc, /tracked field/i);
			expect(getComputedStyle(grid!).gridTemplateColumns.split(' ').length).toBe(2);
			expect(getComputedStyle(hiddenHost).display).toBe('none');
			expect(getComputedStyle(hiddenHost).gridColumn).toBe('span 2');
		} finally {
			frame.remove();
		}
	});
});
