import { StrictMode, useEffect, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import { selectFieldState, type FormStateContainer } from '@schema-engine/forms/state-container';
import { useFieldArray, useFormField, type FormFieldConfig } from '@/hooks/form-state';
import { fieldText } from '@/hooks/field-text';
import { logger } from '@/lib/logger';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

const config = (name: string, extra: object = {}): FormFieldConfig => ({ $type: 'input', name, id: name, ...extra });

const declared = (...names: string[]): ElementConfig[] => names.map((name) => ({ $type: 'input', name, id: name }));

function TextField({ name, onRender, type = 'text' }: { name: string; onRender?: () => void; type?: string }) {
	onRender?.();
	const { defaultValue, fieldProps } = useFormField(config(name));
	return <input aria-label={name} type={type} defaultValue={fieldText(defaultValue)} {...fieldProps} />;
}

function mount(
	children: ReactNode,
	defaults: Record<string, unknown>,
	options: Parameters<typeof createTestContainer>[0] = {},
) {
	const container = createTestContainer({ defaults, ...options });
	const view = render(<ContainerHarness container={container}>{children}</ContainerHarness>);
	return { ...view, container };
}

const valueOf = (container: FormStateContainer, path: string) =>
	(container.getSnapshot().values as Record<string, unknown>)[path];

afterEach(() => vi.restoreAllMocks());

describe('an uncontrolled field', () => {
	test('typing renders the field zero times once it is dirty', async () => {
		const onRender = vi.fn();
		const { container } = mount(
			<TextField name="note" onRender={onRender} />,
			{ note: '' },
			{ elements: declared('note') },
		);
		const input = screen.getByRole('textbox', { name: 'note' });

		await userEvent.type(input, 'a');
		const afterFirst = onRender.mock.calls.length;
		await userEvent.type(input, 'bcd');

		expect(onRender).toHaveBeenCalledTimes(afterFirst);
		expect(valueOf(container, 'note')).toBe('abcd');
	});

	test('reset and setValue in code write back into the control', async () => {
		const { container } = mount(<TextField name="note" />, { note: 'start' }, { elements: declared('note') });
		const input = screen.getByRole('textbox', { name: 'note' });

		await userEvent.type(input, ' more');
		act(() => container.reset());
		expect(input).toHaveValue('start');

		act(() => container.setValue('note', 'from code'));
		expect(input).toHaveValue('from code');
	});

	test('a keystroke in the middle of the text keeps the cursor', async () => {
		mount(<TextField name="note" />, { note: 'abcd' }, { elements: declared('note') });
		const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'note' });
		input.focus();
		input.setSelectionRange(2, 2);

		await userEvent.keyboard('X');

		expect(input).toHaveValue('abXcd');
		expect(input.selectionStart).toBe(3);
	});

	test('a number input with unparsable text keeps it and reports badInput', async () => {
		const { container } = mount(
			<TextField name="age" type="number" />,
			{ age: 1 },
			{ elements: declared('age'), validationMode: 'onChange' },
		);
		const input = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'age' });

		await userEvent.type(input, 'e');
		act(() => container.setValue('other', 'noise'));

		expect(input.validity.badInput).toBe(true);
		await act(() => container.validate(['age']));
		expect(selectFieldState(container.getSnapshot(), 'age').error).toMatchObject({
			type: 'badInput',
			source: 'native',
		});
	});

	test('a radio group writes the checked option back to every radio of the path', () => {
		function Radios() {
			const { defaultValue, fieldProps } = useFormField(config('size'));
			return (
				<>
					{['s', 'm', 'l'].map((option) => (
						<input
							key={option}
							type="radio"
							aria-label={option}
							value={option}
							defaultChecked={defaultValue === option}
							{...fieldProps}
							id={option}
						/>
					))}
				</>
			);
		}
		const { container } = mount(<Radios />, { size: 'm' }, { elements: declared('size') });

		expect(screen.getByLabelText('m')).toBeChecked();
		act(() => screen.getByLabelText('l').click());
		expect(valueOf(container, 'size')).toBe('l');

		act(() => container.setValue('size', 's'));
		expect(screen.getByLabelText('s')).toBeChecked();
		expect(screen.getByLabelText('l')).not.toBeChecked();
		act(() => container.reset());
		expect(screen.getByLabelText('m')).toBeChecked();
	});

	test('a checkbox list reads and writes membership in an array', () => {
		function Checks() {
			const { defaultValue, fieldProps } = useFormField(config('tags'));
			const selected = Array.isArray(defaultValue) ? defaultValue : [];
			return (
				<>
					{['a', 'b', 'c'].map((option) => (
						<input
							key={option}
							type="checkbox"
							aria-label={option}
							value={option}
							defaultChecked={selected.includes(option)}
							{...fieldProps}
							id={option}
						/>
					))}
				</>
			);
		}
		const { container } = mount(<Checks />, { tags: ['a'] }, { elements: declared('tags') });

		act(() => screen.getByLabelText('c').click());
		expect(valueOf(container, 'tags')).toEqual(['a', 'c']);

		act(() => container.setValue('tags', ['b']));
		expect(screen.getByLabelText('a')).not.toBeChecked();
		expect(screen.getByLabelText('b')).toBeChecked();
	});

	test('a multiple select writes its options back', () => {
		function Pick() {
			const { defaultValue, fieldProps } = useFormField(config('colors'));
			return (
				<select
					multiple
					aria-label="colors"
					defaultValue={Array.isArray(defaultValue) ? defaultValue : []}
					{...fieldProps}
				>
					<option value="red">red</option>
					<option value="green">green</option>
					<option value="blue">blue</option>
				</select>
			);
		}
		const { container } = mount(<Pick />, { colors: ['red'] }, { elements: declared('colors') });
		const select = screen.getByLabelText<HTMLSelectElement>('colors');

		act(() => container.setValue('colors', ['green', 'blue']));

		expect([...select.selectedOptions].map((option) => option.value)).toEqual(['green', 'blue']);
	});

	test('rows that swap keep each control with its row', async () => {
		const handle: { swap?: () => void } = {};
		function Rows() {
			const array = useFieldArray('rows');
			useEffect(() => {
				handle.swap = () => array.swap(0, 1);
			});
			return (
				<>
					{array.fields.map((field, index) => (
						<TextField key={field.id} name={`rows.${index}`} />
					))}
				</>
			);
		}
		const { container } = mount(<Rows />, { rows: ['one', 'two'] }, { elements: declared('rows') });
		const first = screen.getByRole('textbox', { name: 'rows.0' });
		const second = screen.getByRole('textbox', { name: 'rows.1' });
		await userEvent.type(first, '!');

		act(() => handle.swap?.());

		expect(first).toHaveValue('one!');
		expect(second).toHaveValue('two');
		expect(screen.getByRole('textbox', { name: 'rows.1' })).toBe(first);
		expect(container.getSnapshot().values.rows).toEqual(['two', 'one!']);
	});

	test('a control that replaces another of the same field takes the container value, not the one React rendered first', async () => {
		function Swappable({ tag }: { tag: 'input' | 'textarea' }) {
			const { defaultValue, fieldProps } = useFormField(config('note'));
			const text = fieldText(defaultValue);
			return tag === 'input' ? (
				<input key="input" aria-label="note" defaultValue={text} {...fieldProps} />
			) : (
				<textarea key="textarea" aria-label="note" defaultValue={text} {...fieldProps} />
			);
		}
		const { container, rerender } = mount(
			<Swappable tag="input" />,
			{ note: 'server' },
			{ elements: declared('note') },
		);
		await userEvent.type(screen.getByRole('textbox', { name: 'note' }), ' edited');

		rerender(
			<ContainerHarness container={container}>
				<Swappable tag="textarea" />
			</ContainerHarness>,
		);

		expect(screen.getByRole('textbox', { name: 'note' }).tagName).toBe('TEXTAREA');
		expect(screen.getByRole('textbox', { name: 'note' })).toHaveValue('server edited');
		expect(valueOf(container, 'note')).toBe('server edited');
	});

	test('removing the first row keeps the text of the rows after it with their rows', async () => {
		const handle: { remove?: () => void } = {};
		function Rows() {
			const array = useFieldArray('rows');
			useEffect(() => {
				handle.remove = () => array.remove(0);
			});
			return (
				<>
					{array.fields.map((field, index) => (
						<TextField key={field.id} name={`rows.${index}`} />
					))}
				</>
			);
		}
		const { container } = mount(<Rows />, { rows: ['one', 'two', 'three'] }, { elements: declared('rows') });
		await userEvent.type(screen.getByRole('textbox', { name: 'rows.1' }), '!');

		act(() => handle.remove?.());

		expect(screen.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value)).toEqual([
			'two!',
			'three',
		]);
		expect(container.getSnapshot().values.rows).toEqual(['two!', 'three']);
	});

	test('a textarea and a multiple select report what the user does', async () => {
		function Mixed() {
			const note = useFormField(config('note'));
			const colors = useFormField(config('colors'));
			return (
				<>
					<textarea aria-label="note" defaultValue={fieldText(note.defaultValue)} {...note.fieldProps} />
					<select multiple aria-label="colors" {...colors.fieldProps}>
						<option value="red">red</option>
						<option value="green">green</option>
					</select>
				</>
			);
		}
		const { container } = mount(<Mixed />, { note: '', colors: [] }, { elements: declared('note', 'colors') });

		await userEvent.type(screen.getByRole('textbox', { name: 'note' }), 'hi');
		await userEvent.selectOptions(screen.getByRole('listbox', { name: 'colors' }), ['green']);

		expect(valueOf(container, 'note')).toBe('hi');
		expect(valueOf(container, 'colors')).toEqual(['green']);
	});

	test('attaching twice under Strict Mode is harmless', async () => {
		const { container } = mount(
			<StrictMode>
				<TextField name="note" />
			</StrictMode>,
			{ note: 'x' },
			{ elements: declared('note') },
		);
		const input = screen.getByRole('textbox', { name: 'note' });

		await userEvent.type(input, 'y');

		expect(input).toHaveValue('xy');
		expect(valueOf(container, 'note')).toBe('xy');
		expect(container.getSnapshot().dirty).toEqual({ note: true });
	});

	test('text typed before hydration is kept', async () => {
		const container = createTestContainer({ defaults: { note: 'server' }, elements: declared('note') });
		const tree = (
			<ContainerHarness container={container}>
				<TextField name="note" />
			</ContainerHarness>
		);
		const host = document.createElement('div');
		host.innerHTML = renderToString(tree);
		document.body.append(host);
		const input = host.querySelector('input');
		if (!input) throw new Error('The server markup has no input.');
		expect(input).toHaveValue('server');
		input.value = 'typed early';

		await act(async () => {
			render(tree, { container: host, hydrate: true });
		});

		expect(host.querySelector('input')).toBe(input);
		expect(input).toHaveValue('typed early');
		expect(valueOf(container, 'note')).toBe('typed early');
		host.remove();
	});
});

describe('native facts', () => {
	function EmailField({ shown = true }: { shown?: boolean }) {
		return shown ? <TextField name="email" type="email" /> : null;
	}

	test('are reported while the user edits and withdrawn when they are fixed or the control leaves', async () => {
		const { container, rerender } = mount(<EmailField />, { email: '' }, { elements: declared('email') });
		const input = screen.getByRole('textbox', { name: 'email' });

		await userEvent.type(input, 'abc');
		await act(() => container.validate(['email']));
		expect(selectFieldState(container.getSnapshot(), 'email').error).toMatchObject({
			type: 'typeMismatch',
			source: 'native',
			params: { inputType: 'email' },
		});

		await userEvent.type(input, '@b.co');
		await act(() => container.validate(['email']));
		expect(selectFieldState(container.getSnapshot(), 'email').error).toBeUndefined();

		await userEvent.clear(input);
		await userEvent.type(input, 'nope');
		await act(() => container.validate(['email']));
		expect(selectFieldState(container.getSnapshot(), 'email').error?.type).toBe('typeMismatch');

		rerender(
			<ContainerHarness container={container}>
				<EmailField shown={false} />
			</ContainerHarness>,
		);
		await act(() => container.validate(['email']));
		expect(selectFieldState(container.getSnapshot(), 'email').error).toBeUndefined();
	});

	test('a controlled field on a native control reports them too', async () => {
		function Controlled() {
			const { value, onChange, onBlur, fieldProps } = useFormField(config('email'), { controlled: true });
			return (
				<input
					aria-label="email"
					type="email"
					value={fieldText(value)}
					onChange={(event) => onChange(event.target.value)}
					onBlur={onBlur}
					{...fieldProps}
				/>
			);
		}
		const { container } = mount(<Controlled />, { email: '' }, { elements: declared('email') });

		await userEvent.type(screen.getByRole('textbox', { name: 'email' }), 'abc');
		await act(() => container.validate(['email']));

		expect(selectFieldState(container.getSnapshot(), 'email').error?.type).toBe('typeMismatch');
	});
});

describe('the development warning', () => {
	test('names the controlled option when an uncontrolled field is bound to a control that is not native', () => {
		const warn = vi.spyOn(logger, 'warn').mockReturnValue(logger);
		function Custom() {
			const { fieldProps } = useFormField(config('when'));
			return <button type="button" {...fieldProps} />;
		}

		mount(<Custom />, { when: '' }, { elements: declared('when') });

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('{ controlled: true }'));
	});

	test('stays quiet for a native control and for a field that binds no control', () => {
		const warn = vi.spyOn(logger, 'warn').mockReturnValue(logger);
		function Chrome() {
			useFormField(config('shell'));
			return null;
		}

		mount(
			<>
				<TextField name="note" />
				<Chrome />
			</>,
			{ note: '', shell: '' },
			{ elements: declared('note', 'shell') },
		);

		expect(warn).not.toHaveBeenCalled();
	});
});

describe('a controlled field', () => {
	test('renders a component that takes value and onChange, and follows the container', async () => {
		function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
			return (
				<button type="button" onClick={() => onChange(value + 1)}>
					{`count ${value}`}
				</button>
			);
		}
		function Bound() {
			const { value, onChange } = useFormField(config('count'), { controlled: true });
			return <Stepper value={typeof value === 'number' ? value : 0} onChange={onChange} />;
		}
		const { container } = mount(<Bound />, { count: 1 }, { elements: declared('count') });

		await userEvent.click(screen.getByRole('button'));
		expect(screen.getByRole('button')).toHaveTextContent('count 2');
		expect(valueOf(container, 'count')).toBe(2);

		act(() => container.setValue('count', 9));
		expect(screen.getByRole('button')).toHaveTextContent('count 9');
	});
});
