import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test, vi } from 'vitest';
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

	test('arrow keys move country selection', async () => {
		render(<PhoneInputHarness />);
		const countryButton = screen.getByRole('button');
		expect(countryButton).toHaveAttribute('data-country', 'US');

		await userEvent.click(countryButton);
		const search = await screen.findByPlaceholderText('Search country...');
		await userEvent.click(search);
		await userEvent.keyboard('{ArrowDown}{Enter}');

		await waitFor(() => {
			expect(countryButton).not.toHaveAttribute('data-country', 'US');
		});
	});

	test('forwards country changes to consumers', async () => {
		const onCountryChange = vi.fn();
		render(
			<PhoneInput
				value=""
				defaultCountry="US"
				onChange={() => {}}
				onCountryChange={onCountryChange}
				aria-label="Phone number"
			/>,
		);

		await userEvent.click(screen.getByRole('button'));
		const search = await screen.findByPlaceholderText('Search country...');
		await userEvent.click(search);
		await userEvent.keyboard('{ArrowDown}{Enter}');

		await waitFor(() => expect(onCountryChange).toHaveBeenCalled());
	});

	test('picks the country from an international prefix', async () => {
		render(<PhoneInputHarness />);
		const input = screen.getByLabelText('Phone number');
		const countryButton = screen.getByRole('button');
		expect(countryButton).toHaveAttribute('data-country', 'US');

		await userEvent.type(input, '+44');

		await waitFor(() => {
			expect(countryButton).toHaveAttribute('data-country', 'GB');
		});
	});
});
