import { describe, expect, test } from 'vitest';
import { useEffect } from 'react';
import { useForm, FormProvider as RHFFormProvider, type Resolver, type UseFormReturn } from 'react-hook-form';
import { act, render, screen } from '@testing-library/react';
import { useFieldArray } from '@/adapters/rhf/hooks/use-field-array';
import type { FieldArrayValue } from '@schema-engine/forms/adapters';

type Values = Record<string, unknown[]>;

const emptyTagsAreInvalid: Resolver<Values> = async (values) => {
	const errors = (values.tags ?? []).map((tag) => (tag ? undefined : { type: 'required', message: 'Required' }));
	return errors.some(Boolean) ? { values: {}, errors: { tags: errors } as never } : { values, errors: {} };
};

/** @remarks Reads `touchedFields` during render, since React Hook Form only tracks state a render reads. */
function renderRows(defaultValues: Values, resolver?: Resolver<Values>) {
	const handle: { form?: UseFormReturn<Values>; array?: FieldArrayValue } = {};
	function Rows({ name }: { name: string }) {
		const array = useFieldArray(name);
		useEffect(() => {
			handle.array = array;
		});
		return <output data-testid="count">{array.fields.length}</output>;
	}
	function Form() {
		const form = useForm<Values>({ defaultValues, resolver });
		void form.formState.touchedFields;
		useEffect(() => {
			handle.form = form;
		});
		return (
			<RHFFormProvider {...form}>
				<Rows name={Object.keys(defaultValues)[0]} />
			</RHFFormProvider>
		);
	}
	render(<Form />);
	return handle as Required<typeof handle>;
}

describe('RHF useFieldArray adapter', () => {
	test('renders and removes empty scalar rows', () => {
		const { form, array } = renderRows({ tags: ['', 'b', ''] });

		expect(screen.getByTestId('count')).toHaveTextContent('3');
		act(() => array.remove(0));
		expect(screen.getByTestId('count')).toHaveTextContent('2');
		expect(form.getValues()).toEqual({ tags: ['b', ''] });
	});

	test('re-validates row errors after removing a row next to an empty scalar row', async () => {
		const { form, array } = renderRows({ tags: ['', 'x', ''] }, emptyTagsAreInvalid);
		await act(() => form.trigger());

		await act(async () => array.remove(0));

		expect(form.getFieldState('tags.0').error).toBeUndefined();
		expect(form.getFieldState('tags.1').error?.message).toBe('Required');
	});

	test('moves touched state with its row while every row is truthy', () => {
		const { form, array } = renderRows({ items: [{ label: 'a' }, { label: 'b' }] });
		act(() => form.setValue('items.1.label', 'b', { shouldTouch: true }));

		act(() => array.remove(0));

		expect(form.getFieldState('items.0.label').isTouched).toBe(true);
		expect(form.getFieldState('items.1.label').isTouched).toBe(false);
	});

	test('removes a repeated index once, as Radiant does', () => {
		const { form, array } = renderRows({ items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] });

		act(() => array.remove([1, 1]));

		expect(screen.getByTestId('count')).toHaveTextContent('2');
		expect(form.getValues().items).toEqual([{ label: 'a' }, { label: 'c' }]);
	});
});
