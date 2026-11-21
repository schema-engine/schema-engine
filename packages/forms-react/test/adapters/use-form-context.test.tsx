import { describe, expect, test, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import {
	FormProvider as RHFProvider,
	useForm,
	type FieldValues,
	type ResolverResult,
	type UseFormReturn,
} from 'react-hook-form';
import { useFormContext } from '../../src/adapters/rhf/hooks/use-form-context';

/** @remarks The resolver counts validation runs, which is what a tracked `isValid` would add. */
function mountForm(Reader: () => null) {
	let methods!: UseFormReturn<FieldValues>;
	const resolver = vi.fn(async (values: FieldValues): Promise<ResolverResult<FieldValues>> =>
		values.name
			? { values, errors: {} }
			: { values: {}, errors: { name: { type: 'required', message: 'Required' } } },
	);
	function Harness() {
		methods = useForm<FieldValues>({ defaultValues: { name: '' }, resolver });
		return (
			<RHFProvider {...methods}>
				<input data-testid="name" {...methods.register('name')} />
				<Reader />
			</RHFProvider>
		);
	}
	render(<Harness />);
	return { methods: () => methods, resolver };
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
		const { methods, resolver } = mountForm(Reader);
		const afterMount = renders;

		fireEvent.change(screen.getByTestId('name'), { target: { value: 'ada' } });
		fireEvent.blur(screen.getByTestId('name'));
		await act(async () => undefined);

		expect(resolver).not.toHaveBeenCalled();
		expect(renders).toBe(afterMount);

		await act(() => methods().handleSubmit(() => undefined)());

		expect(renders).toBeGreaterThan(afterMount);
	});

	test('a caller that reads isValid validates the form after a change', async () => {
		const Reader = () => {
			const { formState } = useFormContext();
			void formState.isValid;
			return null;
		};
		const { resolver } = mountForm(Reader);

		fireEvent.change(screen.getByTestId('name'), { target: { value: 'ada' } });
		await act(async () => undefined);

		expect(resolver).toHaveBeenCalled();
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
