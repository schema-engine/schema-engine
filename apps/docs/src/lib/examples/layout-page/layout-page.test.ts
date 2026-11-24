import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderPage } from './host';
import { dashboard, placementOf, type Page } from './page';
import { theme } from './theme';

describe('the layout page', () => {
	test('the container carries the theme, the appearance and the drawn templates of every breakpoint', () => {
		const html = renderPage(dashboard);
		const container = html.split('\n')[0]!;

		expect(container).toContain(`class="se-grid" data-se-theme="${theme.id}" data-se-size="comfortable"`);
		expect(container).toContain(
			'--se-grid-areas:&quot;header&quot; &quot;main&quot; &quot;aside&quot; &quot;footer&quot;',
		);
		expect(container).toContain(
			'--se-grid-areas-md:&quot;header header&quot; &quot;nav main&quot; &quot;nav aside&quot; &quot;footer footer&quot;',
		);
		expect(container).toContain('--se-grid-template-lg:repeat(3, minmax(0, 1fr))');
		expect(container).not.toContain('"header"');
	});

	test('each region is an item that claims its area, and the navigation is hidden until md', () => {
		const html = renderPage(dashboard);

		expect(html).toContain(
			`<main class="se-grid-item" data-se-theme="${theme.id}" style="--se-item-grid-column:main;--se-item-grid-row:main">`,
		);
		expect(html).toMatch(
			/<nav [^>]*--se-item-display:none;--se-item-display-md:var\(--se-item-display-mode, block\)/,
		);
		expect(html).toContain('data-se-surface="outlined"');
		expect(placementOf(dashboard.regions[0]!)).toEqual({ area: 'header' });
	});

	test('a template whose rows differ in length, or whose area is not a rectangle, throws before it renders', () => {
		const ragged: Page = { ...dashboard, grid: { areas: ['header header', 'main'] } };
		const hole: Page = { ...dashboard, grid: { areas: ['a b', 'b a'] } };
		expect(() => renderPage(ragged)).toThrow('areas: row 2 has 1 cell but row 1 has 2.');
		expect(() => renderPage(hole)).toThrow("area 'a' is not rectangular");
	});

	test('the stylesheet is scoped by the theme id the markup carries', () => {
		expect(theme.css).toContain(`[data-se-theme="${theme.id}"]`);
		expect(theme.css).toContain('30rem');
		expect(theme.css).toContain('40rem');
	});
});

describe('the example run', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	test('prints the markup the page shows', async () => {
		const lines: string[] = [];
		vi.spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line));
		await import('./main');
		const page = readFileSync(join(import.meta.dirname, '../../../content/docs/examples/layout-page.mdx'), 'utf8');
		expect(lines.join('\n')).toBe(page.match(/```text\n([\s\S]*?)\n```/)?.[1]);
	});
});
