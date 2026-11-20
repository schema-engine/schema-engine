import { describe, expect, test } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import {
	FormProvider as RHFProvider,
	useForm,
	type FieldValues,
	type ResolverResult,
	type UseFormReturn,
} from 'react-hook-form';
import { useFormContext } from '../../src/adapters/rhf/hooks/use-form-context';

function mountForm(Reader: () => null) {
	let methods!: UseFormReturn<FieldValues>;
	function Harness() {
		methods = useForm<FieldValues>({
			defaultValues: { name: '' },
			resolver: async (values): Promise<ResolverResult<FieldValues>> =>
				values.name
					? { values, errors: {} }
					: { values: {}, errors: { name: { type: 'required', message: 'Required' } } },
		});
		return (
			<RHFProvider {...methods}>
				<input data-testid="name" {...methods.register('name')} />
				<Reader />
			</RHFProvider>
		);
	}
	render(<Harness />);
	return () => methods;
}

describe('useFormContext', () => {
	test('a caller that reads only isSubmitting does not track validity and re-renders only when it changes', async () => {
		let renders = 0;
		const Reader = () => {
			const { formState } = useFormContext();
			void formState.isSubmitting;
			renders += 1;
			return null;
		};
		const methods = mountForm(Reader);
		const afterMount = renders;

		fireEvent.change(screen.getByTestId('name'), { target: { value: 'ada' } });
		await act(() => methods().trigger());
		await act(() => methods().trigger('name'));
		fireEvent.blur(screen.getByTestId('name'));

		expect(methods().control._proxyFormState.isValid).toBe(false);
		expect(methods().control._proxyFormState.errors).toBe(false);
		expect(renders).toBe(afterMount);

		await act(() => methods().handleSubmit(() => undefined)());

		expect(renders).toBeGreaterThan(afterMount);
	});

	test('a caller that reads isValid tracks it', () => {
		const Reader = () => {
			const { formState } = useFormContext();
			void formState.isValid;
			return null;
		};
		const methods = mountForm(Reader);

		expect(methods().control._proxyFormState.isValid).toBeTruthy();
	});

	test('keeps the public formState shape', () => {
		let seen: ReturnType<typeof useFormContext>['formState'] | undefined;
		const Reader = () => {
			seen = useFormContext().formState;
			return null;
		};
		mountForm(Reader);

		expect(Object.keys(seen ?? {}).sort()).toEqual([
			'defaultValues',
			'errors',
			'isSubmitting',
			'isValid',
			'submitCount',
			'touchedFields',
		]);
	});
});
