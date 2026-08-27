import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PhoneInput } from '@/components/ui/schema-engine/components/phone-input';

function PhoneInputHarness() {
	const [value, setValue] = useState('');

	return (
		<>
			<PhoneInput value={value} defaultCountry="US" onChange={setValue} aria-label="Phone number" />
			<span data-testid="value">{value}</span>
		</>
	);
}

describe('PhoneInput primitive', () => {
	test('renders country selector and phone field', () => {
		render(<PhoneInputHarness />);
		expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	test('coerces cleared values to an empty string', async () => {
		render(<PhoneInputHarness />);
		const input = screen.getByLabelText('Phone number');

		fireEvent.change(input, { target: { value: '2025550123' } });
		await waitFor(() => {
			expect(screen.getByTestId('value').textContent).not.toBe('');
		});

		fireEvent.change(input, { target: { value: '' } });
		await waitFor(() => {
			expect(screen.getByTestId('value').textContent).toBe('');
		});
	});
});
