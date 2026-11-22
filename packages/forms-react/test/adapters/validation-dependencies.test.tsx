import { fieldText } from '@/hooks/field-text';
import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { useFormField } from '../../src/adapters';
import { renderProvider } from '../utils/form-harness';

const config: FormConfig = {
	id: 'dependency-form',
	title: 'Dependency Form',
	steps: [
		{
			id: 'step-1',
			title: 'Step 1',
			elements: [
				{ name: 'password', $type: 'input', inputType: 'password' },
				{
					name: 'confirmPassword',
					$type: 'input',
					inputType: 'password',
					rules: [
						{
							type: 'relate',
							fields: ['password'],
							assert: 'allEqual',
							includeSelf: true,
							as: 'auto',
							skipWhenIncomplete: true,
							message: 'Passwords must match',
						},
					],
				},
			],
		},
	],
};

function Probe({ name }: { name: string }) {
	const { value, error, onChange, onBlur } = useFormField({ $type: 'input', name, id: name });
	return (
		<>
			<input
				data-testid={name}
				value={fieldText(value)}
				onChange={(event) => onChange(event.target.value)}
				onBlur={onBlur}
			/>
			<span data-testid={`${name}-error`}>{error ?? ''}</span>
		</>
	);
}

function renderForm() {
	renderProvider(
		config,
		<>
			<Probe name="password" />
			<Probe name="confirmPassword" />
		</>,
	);

	return {
		password: screen.getByTestId('password'),
		confirm: screen.getByTestId('confirmPassword'),
		confirmError: () => screen.getByTestId('confirmPassword-error').textContent,
	};
}

describe('cross-field revalidation', () => {
	it('leaves a confirmation the user has not reached alone', async () => {
		const { password, confirmError } = renderForm();

		fireEvent.change(password, { target: { value: 'hunter2' } });

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(confirmError()).toBe('');
	});

	it('surfaces the mismatch on a touched confirmation when the password changes', async () => {
		const { password, confirm, confirmError } = renderForm();

		fireEvent.change(password, { target: { value: 'hunter2' } });
		fireEvent.change(confirm, { target: { value: 'hunter2' } });
		fireEvent.blur(confirm);
		await waitFor(() => expect(confirmError()).toBe(''));

		fireEvent.change(password, { target: { value: 'hunter3' } });

		await waitFor(() => expect(confirmError()).toBe('Passwords must match'));
	});

	it('clears the mismatch when the password is corrected, without touching the confirmation again', async () => {
		const { password, confirm, confirmError } = renderForm();

		fireEvent.change(password, { target: { value: 'hunter2' } });
		fireEvent.change(confirm, { target: { value: 'hunter2' } });
		fireEvent.blur(confirm);
		fireEvent.change(password, { target: { value: 'hunter3' } });
		await waitFor(() => expect(confirmError()).toBe('Passwords must match'));

		fireEvent.change(password, { target: { value: 'hunter2' } });

		await waitFor(() => expect(confirmError()).toBe(''));
	});
});
