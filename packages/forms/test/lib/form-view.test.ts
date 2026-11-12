import { describe, expect, test } from 'vitest';
import { stepGrid } from '@/lib/form-view';

interface Grid {
	columns?: number;
	gap?: string;
	areas?: string[];
}

describe('stepGrid', () => {
	test('a step grid replaces the form grid rather than merging with it', () => {
		const grid: Grid = { columns: 2, gap: 'loose' };
		const own: Grid = { areas: ['a b'] };
		expect(stepGrid({ grid }, { grid: own })).toBe(own);
		expect(stepGrid({ grid }, { grid: own })).not.toHaveProperty('columns');
	});

	test('a step without a grid uses the form grid', () => {
		const grid: Grid = { columns: 2 };
		expect(stepGrid({ grid }, {})).toBe(grid);
	});

	test('an empty step grid still replaces the form grid', () => {
		const own: Grid = {};
		expect(stepGrid<Grid>({ grid: { columns: 2 } }, { grid: own })).toBe(own);
	});

	test('neither grid set gives undefined', () => {
		expect(stepGrid<Grid>({}, {})).toBeUndefined();
	});
});
