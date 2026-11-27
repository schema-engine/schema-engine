import { describe, expect, test } from 'vitest';
import { builtInAxes, createLayoutTheme, defineAxis } from '@/index';

/**
 * The selector of every rule in a stylesheet, including rules inside `@media` and `@container`.
 *
 * @remarks Splits on `{`/`}` and keeps what sits before an opening brace, minus the at-rule preludes.
 */
function selectorsOf(css: string): string[] {
	return Array.from(
		css.replaceAll(/@(?:media|container)[^{]*\{/g, '').matchAll(/([^{}]+)\{/g),
		(match) => match[1] ?? '',
	)
		.map((prelude) => prelude.trim())
		.filter((prelude) => prelude !== '');
}

const css = createLayoutTheme({
	grid: { responsive: { md: { default: '1.25rem' } } },
	appearance: [
		...builtInAxes,
		defineAxis({
			$type: 'tone',
			metadata: { name: 'Tone' },
			default: 'neutral',
			values: { neutral: {}, brand: { '--se-tone-accent': '#f60' } },
		}),
	],
}).css;

describe('the layout stylesheet hooks', () => {
	test('no selector mentions forms', () => {
		const selectors = selectorsOf(css);
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.filter((selector) => /form/i.test(selector))).toEqual([]);
	});

	test('class selectors are the neutral se-grid, se-grid-item and se-subgrid, scoped by data-se-theme', () => {
		const classes = new Set(Array.from(css.matchAll(/\.([a-z][\w-]*)/g), (match) => match[1]));
		expect(classes).toEqual(new Set(['se-grid', 'se-grid-item', 'se-subgrid']));
		expect(css).toMatch(/\.se-subgrid\[data-se-theme="l[0-9a-z]+"\]\{/);
		expect(css).toMatch(/\.se-grid\[data-se-theme="l[0-9a-z]+"\]\{/);
		expect(css).toMatch(/\.se-grid-item\[data-se-theme="l[0-9a-z]+"\]\{/);
	});

	test('container mode adds only the neutral se-grid-container hook, scoped by data-se-theme', () => {
		const containerCss = createLayoutTheme({ grid: { query: 'container' } }).css;
		const classes = new Set(Array.from(containerCss.matchAll(/\.([a-z][\w-]*)/g), (match) => match[1]));
		expect(classes).toEqual(new Set(['se-grid', 'se-grid-item', 'se-subgrid', 'se-grid-container']));
		expect(containerCss).toMatch(/\.se-grid-container\[data-se-theme="l[0-9a-z]+"\]\{/);
		expect(selectorsOf(containerCss).filter((selector) => /form/i.test(selector))).toEqual([]);
	});

	test('the old form-named hooks are gone, with no alias', () => {
		expect(css).not.toContain('se-form-grid');
		expect(css).not.toContain('se-form-field');
	});
});
