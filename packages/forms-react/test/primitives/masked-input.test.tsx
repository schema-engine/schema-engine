import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import { MaskedInput } from '@/components/ui/schema-engine/components/masked-input';

function MaskedInputHarness({ mask = '0000', unmask = false }: { mask?: string; unmask?: boolean | 'typed' }) {
	const [value, setValue] = useState('');

	return (
		<>
			<MaskedInput
				mask={mask}
				unmask={unmask}
				onChange={setValue}
				data-testid="masked-input"
				aria-label="Masked value"
			/>
			<span data-testid="value">{value}</span>
		</>
	);
}

describe('MaskedInput primitive', () => {
	test('renders with schema-engine slot marker', () => {
		render(<MaskedInputHarness />);
		expect(screen.getByTestId('masked-input')).toHaveAttribute('data-slot', 'masked-input');
	});

	test('applies initial mask value from defaultMaskValue', async () => {
		render(<MaskedInput mask="00-00" defaultMaskValue="12-34" data-testid="masked-input" />);

		await waitFor(() => {
			expect(screen.getByTestId('masked-input')).toHaveValue('12-34');
		});
	});

	test('applies mask formatting and reports masked values by default', async () => {
		render(<MaskedInputHarness mask="00-00" />);
		const input = screen.getByTestId('masked-input');

		await userEvent.type(input, '1234');

		await waitFor(() => {
			expect(screen.getByTestId('value').textContent).toBe('12-34');
		});
	});

	test('reports unmasked values when unmask is enabled', async () => {
		render(<MaskedInputHarness mask="00-00" unmask={true} />);
		const input = screen.getByTestId('masked-input');

		await userEvent.type(input, '1234');

		await waitFor(() => {
			expect(screen.getByTestId('value').textContent).toBe('1234');
		});
	});
});
