import { describe, expect, test, vi } from 'vitest';
import {
	assertAxesNotReserved,
	builtInAxes,
	createLayoutTheme,
	defineAxis,
	getDefaultLayoutTheme,
	getGridItemVariables,
	getGridVariables,
	isLayoutTheme,
} from '@/index';

const axis = (name: string, ...values: string[]) =>
	defineAxis({
		$type: name,
		metadata: { name },
		default: values[0] ?? 'a',
		values: Object.fromEntries(values.map((value) => [value, {}])),
	});
const tone = axis('tone', 'neutral', 'brand');

describe('createLayoutTheme', () => {
	test('compiles grid and appearance into one theme with one id and one stylesheet', () => {
		const theme = createLayoutTheme({
			grid: { gap: { loose: '3rem' } },
			appearance: [
				...builtInAxes,
				defineAxis({
					$type: 'tone',
					metadata: { name: 'Tone' },
					default: 'neutral',
					values: { neutral: {}, brand: { '--se-tone-accent': '#f60' } },
				}),
			],
		});
		expect(theme.id).toMatch(/^l[0-9a-z]+$/);
		expect(theme.grid.gap.loose).toBe('3rem');
		expect(Object.keys(theme.axes)).toEqual(['size', 'surface', 'tone']);
		expect(theme.appearance.keys()).toEqual(['size', 'surface', 'tone']);
		expect(new Set(theme.css.match(/data-se-theme="[^"]*"/g))).toEqual(new Set([`data-se-theme="${theme.id}"`]));
		expect(theme.css).toContain('--se-tone-accent:#f60');
		expect(theme.css).toContain('grid-template-columns');
		expect(theme.css).not.toContain('data-se-grid-theme');
		expect(theme.css).not.toContain('data-se-appearance-theme');
	});

	test('a host overrides a built-in axis: the compact rule carries the host token', () => {
		const size = defineAxis({
			$type: 'size',
			metadata: { name: 'Size' },
			default: 'default',
			values: { compact: { '--se-space': '0.5rem' }, default: {}, comfortable: { '--se-space': '2rem' } },
		});
		const theme = createLayoutTheme({ appearance: [...builtInAxes, size] });
		expect(theme.css).toContain(`[data-se-size="compact"]){--se-space:0.5rem;}`);
		expect(theme.css).not.toContain('--se-space:1rem');
		expect(theme.id).not.toBe(getDefaultLayoutTheme().id);
	});

	test('a theme with no options is the shared library default', () => {
		expect(createLayoutTheme().id).toBe(getDefaultLayoutTheme().id);
		expect(getDefaultLayoutTheme()).toBe(getDefaultLayoutTheme());
		expect(getDefaultLayoutTheme().grid.breakpoints.md).toBe('48rem');
	});

	test('the same options give the same id, whatever the key order of the grid responsive entries', () => {
		const a = createLayoutTheme({ grid: { responsive: { md: { default: '1rem' }, lg: { default: '2rem' } } } });
		const b = createLayoutTheme({ grid: { responsive: { lg: { default: '2rem' }, md: { default: '1rem' } } } });
		expect(a.id).toBe(b.id);
	});

	test('a change to either half changes the id', () => {
		const base = createLayoutTheme({ grid: { minColumnWidth: '10rem' }, appearance: [axis('tone', 'a', 'x')] });
		expect(
			createLayoutTheme({ grid: { minColumnWidth: '11rem' }, appearance: [axis('tone', 'a', 'x')] }).id,
		).not.toBe(base.id);
		expect(
			createLayoutTheme({ grid: { minColumnWidth: '10rem' }, appearance: [axis('tone', 'b', 'x')] }).id,
		).not.toBe(base.id);
	});

	test('token values, gap tokens and breakpoints are part of the identity', () => {
		const tokens = (value: string) =>
			createLayoutTheme({
				appearance: [
					defineAxis({
						$type: 'tone',
						metadata: { name: 'Tone' },
						default: 'a',
						values: { a: {}, brand: { '--x': value } },
					}),
				],
			}).id;
		expect(tokens('#f60')).not.toBe(tokens('#f70'));
		const gap = (value: string) => createLayoutTheme({ grid: { gap: { loose: value } } }).id;
		expect(gap('2rem')).not.toBe(gap('3rem'));
		const breakpoint = (value: string) => createLayoutTheme({ grid: { breakpoints: { md: value } } }).id;
		expect(breakpoint('50rem')).not.toBe(breakpoint('52rem'));
	});

	test('one theme stylesheet never mentions another theme id', () => {
		const first = createLayoutTheme({ appearance: [axis('tone', 'a', 'x')] });
		const second = createLayoutTheme({ appearance: [axis('tone', 'b', 'x')] });
		expect(first.css).not.toContain(second.id);
		expect(second.css).not.toContain(first.id);
	});

	test('reserved axis names are a compiler input', () => {
		expect(() =>
			createLayoutTheme({ appearance: [axis('step', 'a', 'b')] }, { reservedNames: ['step'] }),
		).toThrowError(/reserved/);
		expect(() => createLayoutTheme({ appearance: [axis('step', 'a', 'b')] })).not.toThrow();
	});

	test('a compiled theme can be checked against another domain reserved names', () => {
		const theme = createLayoutTheme({ appearance: [axis('step', 'a', 'b')] });
		expect(() => assertAxesNotReserved(theme, ['step'])).toThrowError(/'step'.*reserved/);
		expect(() => assertAxesNotReserved(theme, ['row'])).not.toThrow();
	});

	test('is frozen, and recognised as a compiled theme', () => {
		const theme = createLayoutTheme();
		expect(Object.isFrozen(theme)).toBe(true);
		expect(isLayoutTheme(theme)).toBe(true);
		expect(isLayoutTheme({ ...theme })).toBe(false);
		expect(isLayoutTheme({ grid: {}, appearance: [] })).toBe(false);
		expect(isLayoutTheme(undefined)).toBe(false);
	});

	test('the brand is a non-enumerable shared symbol, so copies lose it and no copy of the module is needed to read it', () => {
		const theme = createLayoutTheme();
		const brand = Symbol.for('@schema-engine/layout/theme');
		expect(Object.getOwnPropertySymbols(theme)).toContain(brand);
		expect(Object.keys(theme)).toEqual(['id', 'grid', 'axes', 'appearance', 'css']);
		expect(JSON.stringify(theme)).not.toContain('layout/theme');
		expect(isLayoutTheme(JSON.parse(JSON.stringify(theme)))).toBe(false);
	});

	test('a theme from a second copy of the module is still a theme', async () => {
		vi.resetModules();
		const other = await import('@/index');
		const foreign = other.createLayoutTheme({ appearance: [tone] });
		expect(other.createLayoutTheme).not.toBe(createLayoutTheme);
		expect(isLayoutTheme(foreign)).toBe(true);
		expect(other.isLayoutTheme(createLayoutTheme())).toBe(true);
	});

	test('the emitters take the grid half of the theme', () => {
		const theme = createLayoutTheme({ grid: { minColumnWidth: '10rem' } });
		expect(getGridVariables({ columns: 'auto' }, theme.grid, [])).toEqual({
			'--se-grid-template': 'repeat(auto-fit, minmax(min(10rem, 100%), 1fr))',
		});
		expect(getGridItemVariables({ column: 2 })).toEqual({ '--se-field-grid-column': '2' });
	});
});
