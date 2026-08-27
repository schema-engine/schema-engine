import { describe, expect, test, vi } from 'vitest';
import { useForm, FormProvider as RHFFormProvider } from 'react-hook-form';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormAdapterContext, useFormContext } from '@/adapters/context';
import { rhfAdapter } from '@/adapters/rhf';
import { useControlledFormElement } from '@/hooks/use-field';

function AdapterForm({
	defaultValues,
	onSubmit,
	children,
}: {
	defaultValues: Record<string, unknown>;
	onSubmit: (data: Record<string, unknown>) => void;
	children: ReactNode;
}) {
	const form = useForm({ defaultValues });

	return (
		<FormAdapterContext.Provider value={rhfAdapter}>
			<RHFFormProvider {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
			</RHFFormProvider>
		</FormAdapterContext.Provider>
	);
}

function BoundInput({ name, id, disabled }: { name: string; id: string; disabled?: boolean }) {
	const { fieldProps, value, onChange, onBlur } = useControlledFormElement({
		name,
		id,
		$type: 'input',
		disabled,
	});

	return (
		<input
			data-testid={id}
			value={(value as string) ?? ''}
			onChange={(event) => onChange(event.target.value)}
			onBlur={onBlur}
			{...fieldProps}
		/>
	);
}

describe('RHF useFormField adapter contract', () => {
	test('registers a field ref so setFocus moves keyboard focus', async () => {
		function FocusHarness() {
			const { setFocus } = useFormContext();
			return (
				<>
					<BoundInput id="email" name="email" />
					<button type="button" onClick={() => setFocus('email')}>
						Focus email
					</button>
				</>
			);
		}

		render(
			<AdapterForm defaultValues={{ email: '' }} onSubmit={vi.fn()}>
				<FocusHarness />
			</AdapterForm>,
		);

		const input = screen.getByTestId('email');
		expect(input).not.toHaveFocus();

		fireEvent.click(screen.getByRole('button', { name: 'Focus email' }));

		await waitFor(() => {
			expect(input).toHaveFocus();
		});
	});

	test('passes disabled to the controller so disabled values are omitted on submit', async () => {
		const onSubmit = vi.fn();

		render(
			<AdapterForm defaultValues={{ visible: 'shown', secret: 'hidden' }} onSubmit={onSubmit}>
				<BoundInput id="visible" name="visible" />
				<BoundInput id="secret" name="secret" disabled />
				<button type="submit">Save</button>
			</AdapterForm>,
		);

		expect(screen.getByTestId('secret')).toBeDisabled();

		fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});

		expect(onSubmit.mock.calls[0]?.[0]).toEqual({ visible: 'shown' });
		expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('secret');
	});
});
