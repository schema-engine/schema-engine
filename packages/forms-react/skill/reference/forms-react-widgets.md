# Writing a React widget

Task: add or change a field widget for the React renderer, and test it. A widget is the render function of an element registration; the engine owns the state, so a widget only reads the field's status and hands the user's changes back. Registering it (`defineInput`) is in `forms.md`; the config shape and the container are there too.

Call `useFormField` with the config the widget receives. It returns the field's status (`error`, `warning`, `invalid`, `issue`, `isTouched`, `isDirty`, `isValidating`), `required` and `disabled` (a `require` constraint counts), and the props of the label, the error and the control: `labelProps`, `errorProps` (`null` while there is no text to show), `containerStyles` and `fieldProps`. Give every element an `id`: the label and the error are tied to the control by it.

## Uncontrolled or controlled

| The widget renders                                                                           | Call                                         | The field re-renders                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| A real `input`, `select` or `textarea` (or a native checkbox, radio, file)                   | `useFormField(config)`                       | For an error, warning or flag; never for a keystroke |
| A component that takes only `value` and `onChange` (Radix, Base UI, a date picker, your own) | `useFormField(config, { controlled: true })` | Whenever the value changes                           |

**Uncontrolled is the default.** The control keeps its own text. Spread `fieldProps` on it (`ref`, `id`, `name`, `required`, `disabled`, `readOnly`, `aria-invalid`, `aria-describedby`, `onChange`, `onBlur`) and give it `defaultValue`, frozen when the field mounts and the server's value while the form hydrates. A checkbox takes `defaultChecked={Boolean(defaultValue)}`, and each radio of a group takes `defaultChecked={defaultValue === option}` with `fieldProps` first and its own `id` after. `fieldText(defaultValue)` makes a string of any default. The form reads what the user did from the control (text from `.value`, a checkbox from `.checked`, a number from `valueAsNumber`, a `select multiple` from its selected options, a file input from its files) and, when the container changes (a reset, `setValue`, a row update), writes it back into the control only if it differs, so the cursor and an IME composition are left alone.

```tsx title="react/text-field.tsx"
import * as z from 'zod/mini';
import { defineInput, BaseFieldSchema } from '@schema-engine/forms';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const TextFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('text'),
	inputType: z._default(z.enum(['text', 'email']), 'text'),
});

function TextField(config: z.output<typeof TextFieldSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} type={config.inputType} defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

export const textFieldRegistration = defineInput({
	$type: 'text',
	schema: TextFieldSchema,
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: TextField,
});
```

**Controlled** adds `value`, `onChange(value)` and `onBlur()`. `fieldProps` has no change handler, and its `ref` still serves focus. A controlled widget that is not a native control puts `ref` where focus should land and nothing else.

```tsx title="react/rating-field.tsx"
import * as z from 'zod/mini';
import { defineInput, BaseFieldSchema } from '@schema-engine/forms';
import { useFormField } from '@schema-engine/forms-react/hooks';

const RatingFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('rating'),
	max: z._default(z.number().check(z.int(), z.positive()), 5),
});

function StarRating(props: { value: number; max: number; onChange: (value: number) => void; onBlur: () => void }) {
	return Array.from({ length: props.max }, (_, index) => (
		<button
			key={index}
			type="button"
			aria-pressed={props.value === index + 1}
			aria-label={`${index + 1} stars`}
			onClick={() => props.onChange(index + 1)}
			onBlur={props.onBlur}
		/>
	));
}

function RatingField(config: z.output<typeof RatingFieldSchema>) {
	const { value, onChange, onBlur, fieldProps, labelProps } = useFormField(config, { controlled: true });
	const { ref, 'aria-invalid': invalid } = fieldProps;
	return (
		<fieldset ref={ref} aria-invalid={invalid}>
			<legend id={labelProps.htmlFor}>{config.label}</legend>
			<StarRating value={Number(value) || 0} max={config.max} onChange={onChange} onBlur={onBlur} />
		</fieldset>
	);
}

export const ratingFieldRegistration = defineInput({
	$type: 'rating',
	schema: RatingFieldSchema,
	metadata: { name: 'Rating', category: 'input' },
	value: (config) => z.number().check(z.int(), z.gte(1), z.lte(config.max)),
	render: RatingField,
});
```

## Native facts

What a control says about its own value reaches the container as a native fact, and it counts in `validate` and `checkValidity`. A native `input`, `select` or `textarea` contributes one by default: its `validity` (`valueMissing`, `typeMismatch`, `tooShort`, ...), reported from the element `fieldProps.ref` lands on, after each change, on blur and after each render, in both modes. To contribute none, put `ref` on a wrapper that is not a native control (focus still works, as in the rating above), or leave the constraint attributes (`required`, `min`, `pattern`, a typed `type`) off the control. A fact follows the form's validation timing, and the rule's error wins the display when both fail.

## Registering the widget

Register the widget with `defineInput` (`forms.md`) and pass it to `createFormEngine({ elements })`. The engine of this package is the one the profile form below renders with; replacing a packaged widget is the same registration under the same `$type`, listed after it, because the last one wins.

## Testing a widget

Test a widget through the real renderer and the form's own container, not a copy of them. A widget test covers four things: an uncontrolled widget renders zero times per keystroke once dirty, `reset` and `setValue` write back into the control, the error is shown and announced (`aria-invalid`, `aria-describedby` and the alert), and a native control's fact blocks the check. It runs under Testing Library in a browser project.

```tsx title="react/text-field.suite.tsx"
import { Profiler, useEffect, type ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FormRenderer } from '@schema-engine/forms-react';
import { useFormContext, useFormField } from '@schema-engine/forms-react/hooks';
import { engine } from './engine';
import { EmailPreview, ResetButton } from './hooks';
import { profile, ProfileForm } from './profile-form';

let form: ReturnType<typeof useFormContext>;
let emailIssue: ReturnType<typeof useFormField>['issue'];

function Probe() {
	const context = useFormContext();
	const email = useFormField('email');
	useEffect(() => {
		form = context;
		emailIssue = email.issue;
	});
	return null;
}

function mount(defaultValues: Record<string, unknown> = {}, extras: ReactNode = null) {
	const onRender = vi.fn();
	render(
		<Profiler id="form" onRender={onRender}>
			<FormRenderer engine={engine} config={profile} defaultValues={defaultValues}>
				<Probe />
				{extras}
			</FormRenderer>
		</Profiler>,
	);
	return { onRender, input: screen.getByRole('textbox', { name: 'Email' }) };
}

test('typing renders the field zero times once it is dirty', async () => {
	const { onRender, input } = mount();

	await userEvent.type(input, 'a');
	const afterFirst = onRender.mock.calls.length;
	await userEvent.type(input, 'bc');

	expect(onRender).toHaveBeenCalledTimes(afterFirst);
	expect(form.getValues().email).toBe('abc');
});

test('reset and setValue in code write back into the control', async () => {
	const { input } = mount({ email: 'start@example.com' });

	await userEvent.type(input, 'x');
	act(() => form.reset());
	expect(input).toHaveValue('start@example.com');

	act(() => form.setValue('email', 'code@example.com'));
	expect(input).toHaveValue('code@example.com');
});

test('the error is shown, announced, and gone once the value is fixed', async () => {
	const { input } = mount();

	await act(() => form.validate());
	const alert = screen.getByRole('alert');
	expect(alert).toHaveTextContent('Email is required');
	expect(input).toHaveAttribute('aria-invalid', 'true');
	expect(input).toHaveAttribute('aria-describedby', alert.id);

	await userEvent.type(input, 'ada@example.com');
	expect(screen.queryByRole('alert')).toBeNull();
});

test('a native control reports what the browser says about its value', async () => {
	const { input } = mount();

	await userEvent.type(input, 'not an email');
	const result = await act(() => form.validate(['email']));

	expect(result).toEqual({ outcome: 'invalid' });
	expect(screen.getByRole('alert')).toBeInTheDocument();
	expect(emailIssue?.all).toContainEqual(expect.objectContaining({ type: 'typeMismatch', source: 'native' }));
});

test('a controlled component writes through onChange and follows setValue', async () => {
	mount();

	await userEvent.click(screen.getByRole('button', { name: '3 stars' }));
	expect(form.getValues().stars).toBe(3);

	act(() => form.setValue('stars', 5));
	expect(screen.getByRole('button', { name: '5 stars' })).toHaveAttribute('aria-pressed', 'true');
});

test('useWatch follows a value and useFormContext resets the form', async () => {
	const { input } = mount(
		{},
		<>
			<EmailPreview />
			<ResetButton />
		</>,
	);

	await userEvent.type(input, 'ada@example.com');
	expect(screen.getByRole('status')).toHaveTextContent('ada@example.com');

	await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
	expect(input).toHaveValue('');
	expect(screen.getByRole('status')).toHaveTextContent('');
});

test('the form renders its fields and the children it is given', () => {
	render(<ProfileForm />);

	expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
	expect(screen.getByRole('group')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
});
```

Save your copy as `text-field.test.tsx`; the `.suite` name only keeps this mirrored example out of this repository's own test runs.
