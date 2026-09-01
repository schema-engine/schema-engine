import { describe, expect, test } from 'vitest';
import {
	formatDateRange,
	formatISODate,
	parseISODate,
	toDateRangeValue,
	toISODate,
} from '@/components/ui/schema-engine/components/date-utils';

describe('date utils', () => {
	test('round-trips ISO dates', () => {
		const date = new Date(2026, 8, 1);
		expect(toISODate(date)).toBe('2026-09-01');
		expect(toISODate(parseISODate('2026-09-01'))).toBe('2026-09-01');
	});

	test('formats a display label from ISO dates', () => {
		expect(formatISODate('2026-09-01')).toContain('2026');
	});

	test('formats date ranges', () => {
		expect(formatDateRange({ from: '2026-09-01', to: '2026-09-10' })).toContain('2026');
	});

	test('converts picker ranges to ISO values', () => {
		expect(
			toDateRangeValue({
				from: new Date(2026, 8, 1),
				to: new Date(2026, 8, 10),
			}),
		).toEqual({
			from: '2026-09-01',
			to: '2026-09-10',
		});
	});
});
