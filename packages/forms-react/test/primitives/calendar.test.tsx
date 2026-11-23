import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Calendar } from '@/components/ui/schema-engine/components/calendar';

describe('Calendar primitive', () => {
	test('keeps its day grid mounted when it renders again, so a press on a day still ends in a click', () => {
		const month = new Date(2026, 10, 1);
		const { rerender } = render(<Calendar mode="single" month={month} />);
		const grid = screen.getByRole('grid');
		const firstDay = screen.getAllByRole('gridcell')[0];

		rerender(<Calendar mode="single" month={month} className="renders-again" />);

		expect(screen.getByRole('grid')).toBe(grid);
		expect(screen.getAllByRole('gridcell')[0]).toBe(firstDay);
	});
});
