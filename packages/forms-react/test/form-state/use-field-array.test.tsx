import { fieldText } from '@/hooks/field-text';
import { describe, expect, test } from 'vitest';
import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { selectFieldState, type FieldArrayValue, type FormStateContainer } from '@schema-engine/forms/state-container';
import { useFieldArray, useFormField } from '@/hooks/form-state';
import { createFormEngine } from '@schema-engine/forms';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

const engine = createFormEngine({ elements: [InputElementRegistration, ArrayElementRegistration] });
const contacts = engine.validateElement({
	$type: 'arrayElements',
	name: 'contacts',
	rules: [{ $type: 'minItems', value: 3, message: 'Add three' }],
	elements: [
		{ $type: 'input', name: 'email', rules: [{ $type: 'required', message: 'Required' }] },
		{ $type: 'input', name: 'label' },
	],
});

function Row({ path }: { path: string }) {
	const { defaultValue, error, fieldProps } = useFormField({ $type: 'input', name: path, id: path });
	return (
		<>
			<input {...fieldProps} aria-label={path} defaultValue={fieldText(defaultValue)} />
			<output data-testid={`${path}-error`}>{error ?? ''}</output>
		</>
	);
}

function mount(defaults: Record<string, unknown>, elements: object[] = [], name = 'tags') {
	const handle: { array?: FieldArrayValue } = {};
	const container = createTestContainer({ defaults, elements });
	function Rows() {
		const array = useFieldArray(name);
		const { error: arrayError } = useFormField(name);
		useEffect(() => {
			handle.array = array;
		});
		return (
			<>
				<output data-testid="count">{array.fields.length}</output>
				<output data-testid="array-error">{arrayError ?? ''}</output>
				{array.fields.map((field, index) => (
					<Row key={field.id} path={name === 'contacts' ? `${name}.${index}.email` : `${name}.${index}`} />
				))}
			</>
		);
	}
	render(
		<ContainerHarness container={container}>
			<Rows />
		</ContainerHarness>,
	);
	return {
		container,
		array: () => {
			if (!handle.array) throw new Error('The rows have not rendered.');
			return handle.array;
		},
	};
}

const values = (container: FormStateContainer) => container.getSnapshot().values.tags;

describe('useFieldArray', () => {
	test('renders every row, falsy ones too, and removes an empty scalar row', () => {
		const { container, array } = mount({ tags: ['', 'b', '', 0, false] });

		expect(screen.getByTestId('count')).toHaveTextContent('5');
		act(() => array().remove(0));
		expect(screen.getByTestId('count')).toHaveTextContent('4');
		expect(values(container)).toEqual(['b', '', 0, false]);
	});

	test('keeps the element of an existing row when a row is added', () => {
		const { array } = mount({ tags: ['', 'b'] });
		const before = screen.getByRole('textbox', { name: 'tags.0' });

		act(() => array().append(''));

		expect(screen.getByTestId('count')).toHaveTextContent('3');
		expect(screen.getByRole('textbox', { name: 'tags.0' })).toBe(before);
	});

	test('gives rows new ids when the form resets to the same number of rows', () => {
		const { container } = mount({ tags: ['a', 'b'] });
		const before = screen.getByRole('textbox', { name: 'tags.0' });

		act(() => container.reset({ tags: ['c', 'd'] }));

		expect(screen.getByRole('textbox', { name: 'tags.0' })).not.toBe(before);
		expect(screen.getByRole('textbox', { name: 'tags.0' })).toHaveValue('c');
	});

	test('moves the error of a row with its row when an earlier row is removed', async () => {
		const { container, array } = mount(
			{ contacts: [{ email: 'a' }, { email: 'b' }, { email: '' }] },
			[contacts],
			'contacts',
		);
		await act(() => container.validate(['contacts.2.email']));
		expect(screen.getByTestId('contacts.2.email-error')).toHaveTextContent('Required');

		await act(async () => array().remove(0));

		expect(screen.getByTestId('contacts.1.email-error')).toHaveTextContent('Required');
		expect(screen.getByTestId('contacts.0.email-error')).toBeEmptyDOMElement();
		expect(selectFieldState(container.getSnapshot(), 'contacts.1.email').error?.type).toBe('required');
	});

	test('shows the error of the array itself apart from the errors of its rows', async () => {
		const { container } = mount({ contacts: [{ email: '' }] }, [contacts], 'contacts');

		await act(() => container.validate());

		expect(screen.getByTestId('array-error')).toHaveTextContent('Add three');
		expect(screen.getByTestId('contacts.0.email-error')).toHaveTextContent('Required');
	});

	test('focuses the first control of an added row, wherever it is added, and nothing for an operation that adds none', () => {
		const { array } = mount({ tags: ['', 'b'] });

		act(() => array().append(''));
		expect(screen.getByRole('textbox', { name: 'tags.2' })).toHaveFocus();

		act(() => array().prepend(''));
		expect(screen.getByRole('textbox', { name: 'tags.0' })).toHaveFocus();

		act(() => array().insert(2, ''));
		expect(screen.getByRole('textbox', { name: 'tags.2' })).toHaveFocus();

		screen.getByRole('textbox', { name: 'tags.1' }).focus();
		act(() => array().insert(99, ''));
		expect(screen.getByRole('textbox', { name: 'tags.1' })).toHaveFocus();
	});

	test('returns the same object until the rows change', () => {
		const { container, array } = mount({ tags: ['a'] });
		const first = array();

		act(() => container.setValue('tags.0', 'b'));
		expect(array()).toBe(first);

		act(() => array().append('c'));
		expect(array()).not.toBe(first);
	});
});
