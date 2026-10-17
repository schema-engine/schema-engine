import { describe, expect, test } from 'vitest';
import { useEffect } from 'react';
import {
	useForm,
	useFormContext,
	FormProvider as RHFFormProvider,
	type Resolver,
	type UseFormReturn,
} from 'react-hook-form';
import { act, render, screen } from '@testing-library/react';
import { useFieldArray } from '@/adapters/rhf/hooks/use-field-array';
import type { FieldArrayValue } from '@schema-engine/forms/adapters';

type Values = Record<string, unknown[]>;

const emptyTagsAreInvalid: Resolver<Values> = async (values) => {
	const errors = (values.tags ?? []).map((tag) => (tag ? undefined : { type: 'required', message: 'Required' }));
	return errors.some(Boolean) ? { values: {}, errors: { tags: errors } as never } : { values, errors: {} };
};

/**
 * @remarks
 * Reads `touchedFields` during render, since React Hook Form only tracks state a
 * render reads. With `inputs`, each row renders a registered input, so focus can
 * be observed.
 */
function renderRows(defaultValues: Values, options: { resolver?: Resolver<Values>; inputs?: boolean } = {}) {
	const handle: { form?: UseFormReturn<Values>; array?: FieldArrayValue } = {};
	const name = Object.keys(defaultValues)[0];
	function Rows() {
		const array = useFieldArray(name);
		const { register } = useFormContext<Values>();
		useEffect(() => {
			handle.array = array;
		});
		return (
			<>
				<output data-testid="count">{array.fields.length}</output>
				{options.inputs &&
					array.fields.map((field, index) => (
						<input key={field.id} aria-label={`row ${index}`} {...register(`${name}.${index}`)} />
					))}
			</>
		);
	}
	function Form() {
		const form = useForm<Values>({ defaultValues, resolver: options.resolver });
		void form.formState.touchedFields;
		useEffect(() => {
			handle.form = form;
		});
		return (
			<RHFFormProvider {...form}>
				<Rows />
			</RHFFormProvider>
		);
	}
	render(<Form />);
	return handle as Required<typeof handle>;
}

const touchedRows = (form: UseFormReturn<Values>, count: number) =>
	Array.from({ length: count }, (_, index) => form.getFieldState(`tags.${index}`).isTouched);

describe('RHF useFieldArray adapter', () => {
	test('renders and removes empty scalar rows', () => {
		const { form, array } = renderRows({ tags: ['', 'b', ''] });

		expect(screen.getByTestId('count')).toHaveTextContent('3');
		act(() => array.remove(0));
		expect(screen.getByTestId('count')).toHaveTextContent('2');
		expect(form.getValues()).toEqual({ tags: ['b', ''] });
	});

	test('moves row errors with their row next to an empty scalar row', async () => {
		const { form, array } = renderRows({ tags: ['', '', ''] }, { resolver: emptyTagsAreInvalid });
		await act(() => form.trigger('tags.2'));

		await act(async () => array.remove(0));

		expect(form.getFieldState('tags.0').error).toBeUndefined();
		expect(form.getFieldState('tags.1').error?.message).toBe('Required');
	});

	test.each([
		{ operation: 'remove', run: (array: FieldArrayValue) => array.remove(0), values: ['b', ''], touched: 0 },
		{
			operation: 'prepend',
			run: (array: FieldArrayValue) => array.prepend(''),
			values: ['', '', 'b', ''],
			touched: 2,
		},
		{
			operation: 'insert',
			run: (array: FieldArrayValue) => array.insert(1, ''),
			values: ['', '', 'b', ''],
			touched: 2,
		},
		{ operation: 'swap', run: (array: FieldArrayValue) => array.swap(1, 2), values: ['', '', 'b'], touched: 2 },
		{ operation: 'move', run: (array: FieldArrayValue) => array.move(1, 0), values: ['b', '', ''], touched: 0 },
	])('$operation moves touched state with its row next to an empty scalar row', ({ run, values, touched }) => {
		const { form, array } = renderRows({ tags: ['', 'b', ''] });
		act(() => form.setValue('tags.1', 'b', { shouldTouch: true }));

		act(() => run(array));

		expect(form.getValues().tags).toEqual(values);
		expect(touchedRows(form, values.length)).toEqual(values.map((_, index) => index === touched));
	});

	test('moves touched state with its row while every row is truthy', () => {
		const { form, array } = renderRows({ items: [{ label: 'a' }, { label: 'b' }] });
		act(() => form.setValue('items.1', { label: 'b' }, { shouldTouch: true }));

		act(() => array.remove(0));

		expect(form.getFieldState('items.0').isTouched).toBe(true);
		expect(form.getFieldState('items.1').isTouched).toBe(false);
	});

	test('removes distinct indexes with their state and a repeated index once, as Radiant does', () => {
		const { form, array } = renderRows({ tags: ['a', 'b', 'c', 'd'] });
		act(() => form.setValue('tags.1', 'b', { shouldTouch: true }));

		act(() => array.remove([0, 2]));
		expect(form.getValues().tags).toEqual(['b', 'd']);
		expect(touchedRows(form, 2)).toEqual([true, false]);

		act(() => array.remove([1, 1]));
		expect(form.getValues().tags).toEqual(['b']);
	});

	test.each([
		{ rows: 'truthy', tags: ['a', 'b'] },
		{ rows: 'empty scalar', tags: ['', 'b'] },
	])('ignores an update past the last $rows row, as Radiant does', ({ tags }) => {
		const { form, array } = renderRows({ tags });

		act(() => array.update(2, 'c'));

		expect(form.getValues().tags).toEqual(tags);
		expect(screen.getByTestId('count')).toHaveTextContent('2');
	});

	test.each([
		{ operation: 'insert past the end', run: (array: FieldArrayValue) => array.insert(3, 'c'), tags: ['', 'b'] },
		{ operation: 'move to a missing row', run: (array: FieldArrayValue) => array.move(0, 9), tags: ['', 'b'] },
		{
			operation: 'swap with a negative index',
			run: (array: FieldArrayValue) => array.swap(0, -1),
			tags: ['', 'b'],
		},
		{ operation: 'remove a missing row', run: (array: FieldArrayValue) => array.remove(9), tags: ['', 'b'] },
		{
			operation: 'remove a missing and a present row',
			run: (array: FieldArrayValue) => array.remove([0, 9]),
			tags: ['b'],
		},
	])('ignores a missing row: $operation', ({ run, tags }) => {
		const { form, array } = renderRows({ tags: ['', 'b'] });

		act(() => run(array));

		expect(form.getValues().tags).toEqual(tags);
	});

	test('keeps the ids of existing rows when a row is added', () => {
		const { array } = renderRows({ tags: ['', 'b'] }, { inputs: true });
		const before = screen.getByRole('textbox', { name: 'row 0' });

		act(() => array.append(''));

		expect(screen.getByRole('textbox', { name: 'row 0' })).toBe(before);
	});

	test('gives rows new ids when the form resets to the same number of rows', () => {
		const { form } = renderRows({ tags: ['a', 'b'] }, { inputs: true });
		const before = screen.getByRole('textbox', { name: 'row 0' });

		act(() => form.reset({ tags: ['c', 'd'] }));

		expect(screen.getByRole('textbox', { name: 'row 0' })).not.toBe(before);
		expect(screen.getByRole('textbox', { name: 'row 0' })).toHaveValue('c');
	});

	test('focuses an added row next to an empty scalar row', () => {
		const { array } = renderRows({ tags: ['', 'b'] }, { inputs: true });

		act(() => array.append(''));

		expect(screen.getByRole('textbox', { name: 'row 2' })).toHaveFocus();
	});
});
