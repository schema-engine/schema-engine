import { getDefaultLayoutTheme } from '@schema-engine/layout';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import { useFormContext as useReactHookFormContext } from 'react-hook-form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';

vi.mock('@/hooks/use-form-context', () => ({
	useFormEngine: () => ({
		engine: {
			getValidationRegistry: () => createDefaultValidationRegistry(),
			getLayout: () => getDefaultLayoutTheme(),
		},
	}),
}));

vi.mock('@schema-engine/forms/actions', () => ({
	ActionDispatcher: class {
		dispatch = vi.fn().mockResolvedValue([]);
		dispatchSync = vi.fn();
		hasMatching = () => true;
	},
}));

const config: FormConfig = {
	id: 'validation-form',
	title: 'Validation Form',
	steps: [
		{
			id: 'step-1',
			title: 'Step 1',
			elements: [
				{
					name: 'email',
					$type: 'input',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
			],
		},
	],
};

function ValidationProbe({ name }: { name: string }) {
	const { register, formState } = useReactHookFormContext<Record<string, string>>();
	return (
		<>
			<input data-testid={name} {...register(name)} />
			<span data-testid={`${name}-error`}>{formState.errors[name]?.message ?? ''}</span>
		</>
	);
}

describe('FormProvider validation', () => {
	it('rejects an empty required field on submit', async () => {
		const onSubmit = vi.fn();
		render(
			<FormProvider config={config} onSubmit={onSubmit}>
				<ValidationProbe name="email" />
				<button type="submit">Submit</button>
			</FormProvider>,
		);

		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
		});
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('accepts submit once the required field is filled', async () => {
		const onSubmit = vi.fn();
		render(
			<FormProvider config={config} onSubmit={onSubmit}>
				<ValidationProbe name="email" />
				<button type="submit">Submit</button>
			</FormProvider>,
		);

		fireEvent.change(screen.getByTestId('email'), { target: { value: 'reader@example.com' } });
		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'reader@example.com' }));
		});
		expect(screen.getByTestId('email-error')).toHaveTextContent('');
	});
});
