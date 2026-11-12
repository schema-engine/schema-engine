import { describe, expect, test } from 'vitest';
import {
	assertAxesNotReserved,
	createLayoutTheme,
	getDefaultLayoutTheme,
	getGridItemVariables,
	getGridVariables,
	isLayoutTheme,
} from '@/index';

describe('createLayoutTheme', () => {
	test('compiles grid and appearance into one theme with one id and one stylesheet', () => {
		const theme = createLayoutTheme({
			grid: { gap: { loose: '3rem' } },
			appearance: { tone: { brand: { '--se-tone-accent': '#f60' } } },
		});
		expect(theme.id).toMatch(/^l[0-9a-z]+$/);
		expect(theme.grid.gap.loose).toBe('3rem');
		expect(Object.keys(theme.axes)).toEqual(['size', 'surface', 'tone']);
		expect(theme.css).toContain(`[data-se-theme="${theme.id}"]`);
		expect(theme.css).toContain('--se-tone-accent:#f60');
		expect(theme.css).toContain('grid-template-columns');
		expect(theme.css).not.toContain('data-se-grid-theme');
		expect(theme.css).not.toContain('data-se-appearance-theme');
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
		const base = createLayoutTheme({ grid: { minColumnWidth: '10rem' }, appearance: { tone: ['a'] } });
		expect(createLayoutTheme({ grid: { minColumnWidth: '11rem' }, appearance: { tone: ['a'] } }).id).not.toBe(
			base.id,
		);
		expect(createLayoutTheme({ grid: { minColumnWidth: '10rem' }, appearance: { tone: ['b'] } }).id).not.toBe(
			base.id,
		);
	});

	test('reserved axis names are a compiler input', () => {
		expect(() => createLayoutTheme({ appearance: { step: ['a'] } }, { reservedNames: ['step'] })).toThrowError(
			/reserved/,
		);
		expect(() => createLayoutTheme({ appearance: { step: ['a'] } })).not.toThrow();
	});

	test('a compiled theme can be checked against another domain reserved names', () => {
		const theme = createLayoutTheme({ appearance: { step: ['a'] } });
		expect(() => assertAxesNotReserved(theme, ['step'])).toThrowError(/'step'.*reserved/);
		expect(() => assertAxesNotReserved(theme, ['row'])).not.toThrow();
	});

	test('is frozen, and recognised as a compiled theme', () => {
		const theme = createLayoutTheme();
		expect(Object.isFrozen(theme)).toBe(true);
		expect(isLayoutTheme(theme)).toBe(true);
		expect(isLayoutTheme({ ...theme })).toBe(false);
		expect(isLayoutTheme({ grid: {}, appearance: {} })).toBe(false);
		expect(isLayoutTheme(undefined)).toBe(false);
	});

	test('the emitters take the grid half of the theme', () => {
		const theme = createLayoutTheme({ grid: { minColumnWidth: '10rem' } });
		expect(getGridVariables({ columns: 'auto' }, theme.grid, [])).toEqual({
			'--se-grid-template': 'repeat(auto-fit, minmax(min(10rem, 100%), 1fr))',
		});
		expect(getGridItemVariables({ column: 2 })).toEqual({ '--se-field-grid-column': '2' });
	});
});
