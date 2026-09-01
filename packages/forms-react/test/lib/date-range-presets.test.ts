import { describe, expect, test } from 'vitest';
import {
	DATE_RANGE_PRESETS,
	getDateRangePreset,
	matchDateRangePreset,
} from '@/components/ui/schema-engine/components/date-range-presets';

describe('date range presets', () => {
	test('exposes common presets', () => {
		expect(DATE_RANGE_PRESETS.map((preset) => preset.name)).toEqual([
			'today',
			'yesterday',
			'last7',
			'last14',
			'last30',
			'thisWeek',
			'lastWeek',
			'thisMonth',
			'lastMonth',
		]);
	});

	test('returns a valid range for each preset', () => {
		for (const preset of DATE_RANGE_PRESETS) {
			const range = getDateRangePreset(preset.name);
			expect(range.from).toBeInstanceOf(Date);
			expect(range.to).toBeInstanceOf(Date);
			expect(range.from.getTime()).toBeLessThanOrEqual(range.to.getTime());
		}
	});

	test('matches a preset by its computed range', () => {
		const today = getDateRangePreset('today');
		expect(matchDateRangePreset(today)).toBe('today');
	});

	test('returns undefined when the range does not match a preset', () => {
		const from = new Date(2020, 0, 5);
		const to = new Date(2020, 0, 9);
		expect(matchDateRangePreset({ from, to })).toBeUndefined();
	});
});
