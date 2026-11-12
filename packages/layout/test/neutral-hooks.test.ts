import { describe, expect, test } from 'vitest';
import { createLayoutTheme } from '@/index';

/**
 * The selector of every rule in a stylesheet, including rules inside `@media`.
 *
 * @remarks Splits on `{`/`}` and keeps what sits before an opening brace, minus the `@media` preludes.
 */
function selectorsOf(css: string): string[] {
	return Array.from(css.replaceAll(/@media[^{]*\{/g, '').matchAll(/([^{}]+)\{/g), (match) => match[1] ?? '')
		.map((prelude) => prelude.trim())
		.filter((prelude) => prelude !== '');
}

const css = createLayoutTheme({
	grid: { responsive: { md: { default: '1.25rem' } } },
	appearance: { tone: { brand: { '--se-tone-accent': '#f60' } } },
}).css;

describe('the layout stylesheet hooks', () => {
	test('no selector mentions forms', () => {
		const selectors = selectorsOf(css);
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.filter((selector) => /form/i.test(selector))).toEqual([]);
	});

	test('class selectors are the neutral se-grid and se-grid-item, scoped by data-se-theme', () => {
		const classes = new Set(Array.from(css.matchAll(/\.([a-z][\w-]*)/g), (match) => match[1]));
		expect(classes).toEqual(new Set(['se-grid', 'se-grid-item']));
		expect(css).toMatch(/\.se-grid\[data-se-theme="l[0-9a-z]+"\]\{/);
		expect(css).toMatch(/\.se-grid-item\[data-se-theme="l[0-9a-z]+"\]\{/);
	});

	test('the old form-named hooks are gone, with no alias', () => {
		expect(css).not.toContain('se-form-grid');
		expect(css).not.toContain('se-form-field');
	});
});
