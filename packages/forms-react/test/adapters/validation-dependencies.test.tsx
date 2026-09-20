import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import { useFormContext as useReactHookFormContext } from 'react-hook-form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';

vi.mock('@/hooks/use-form-context', () => ({
	useFormEngine: () => ({ engine: { getValidationRegistry: () => createDefaultValidationRegistry() } }),
}));

vi.mock('@schema-engine/actions', () => ({
	ActionDispatcher: class {
		dispatch = vi.fn().mockResolvedValue([]);
		dispatchSync = vi.fn();
	},
}));

const config: FormConfig = {
	id: 'dependency-form',
	title: 'Dependency Form',
	mode: 'wizard',
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
	const { register, formState } = useReactHookFormContext();
	return (
		<>
			<input data-testid={name} {...register(name)} />
			<span data-testid={`${name}-error`}>{(formState.errors[name]?.message as string) ?? ''}</span>
		</>
	);
}

function renderForm() {
	render(
		<FormProvider config={config}>
			<Probe name="password" />
			<Probe name="confirmPassword" />
		</FormProvider>,
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

		await waitFor(() => expect(confirmError()).toBe(''));
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
