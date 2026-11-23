# Writing a widget

Task: add or change a field widget, in React or Radiant, register it, and test it. A widget is the render function of an element registration; the engine owns the state, so a widget only reads the field's status and hands the user's changes back. The config shape and the container are in `forms.md`.

## React

Call `useFormField` with the config the widget receives. It returns the field's status (`error`, `warning`, `invalid`, `issue`, `isTouched`, `isDirty`, `isValidating`), `required` and `disabled` (a `require` constraint counts), and the props of the label, the error and the control: `labelProps`, `errorProps` (`null` while there is no text to show), `containerStyles` and `fieldProps`. Give every element an `id`: the label and the error are tied to the control by it.

### Uncontrolled or controlled

| The widget renders                                                                           | Call                                         | The field re-renders                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| A real `input`, `select` or `textarea` (or a native checkbox, radio, file)                   | `useFormField(config)`                       | For an error, warning or flag; never for a keystroke |
| A component that takes only `value` and `onChange` (Radix, Base UI, a date picker, your own) | `useFormField(config, { controlled: true })` | Whenever the value changes                           |

**Uncontrolled is the default.** The control keeps its own text. Spread `fieldProps` on it (`ref`, `id`, `name`, `required`, `disabled`, `readOnly`, `aria-invalid`, `aria-describedby`, `onChange`, `onBlur`) and give it `defaultValue`, frozen when the field mounts and the server's value while the form hydrates. A checkbox takes `defaultChecked={Boolean(defaultValue)}`, and each radio of a group takes `defaultChecked={defaultValue === option}` with `fieldProps` first and its own `id` after. `fieldText(defaultValue)` makes a string of any default. The form reads what the user did from the control (text from `.value`, a checkbox from `.checked`, a number from `valueAsNumber`, a `select multiple` from its selected options, a file input from its files) and, when the container changes (a reset, `setValue`, a row update), writes it back into the control only if it differs, so the cursor and an IME composition are left alone.

```tsx title="react/text-field.tsx"
import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
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
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
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

Show an error by its text (`error`, from the formatter or the issue's own `message`), but mark the control invalid from `invalid`, which is true even when no text exists. `issue` is the engine's error (`type`, `ruleId`, `params`, `all`) for a widget that words it itself; `warning` is advice and never blocks.

## Radiant

A Radiant widget is a function component too. It renders a `FormField` (the `se-field` host) around its label, its control and a `RuiFieldError`, and the control sits inside the field. The field finds its control by the `data-rui-control` marker on a native input (Radiant UI's inputs carry it) or by the tag of a custom host registered with `registerFieldControl`; it reads the control's value, writes the form's value back into it, and paints the label, error and ARIA state. The widget holds no state of its own.

```tsx title="radiant/text-field.tsx"
import * as z from 'zod/mini';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { FormField } from '@schema-engine/forms-radiant/primitives';

const TextFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('text'),
	inputType: z._default(z.enum(['text', 'email']), 'text'),
});

function TextField(config: z.output<typeof TextFieldSchema>) {
	return (
		<FormField name={config.name}>
			<RuiLabel htmlFor={config.id}>{config.label}</RuiLabel>
			<RuiInput id={config.id} name={config.name} type={config.inputType} />
			<RuiFieldError />
		</FormField>
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

A control that is not a native input is a custom host. It is a custom element registered with `registerFieldControl(tagName, { read, write, submission })` from `@ecopages/radiant-ui/form`: `read` returns the host's value, `write` sets it. When the user changes the value the host updates `value` first and then dispatches a bubbling, composed `input` event and, for a final change, a `change` event. A host must call `announceControlConnect(this)` when it connects, so a field that registered earlier seeds it with the value the form holds and reads its validity. Read and write the form from inside an element with a `FormController` (`forms-radiant.md`).

```tsx title="radiant/stars-field.tsx"
import * as z from 'zod/mini';
import { customElement, prop } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { announceControlConnect, registerFieldControl } from '@ecopages/radiant-ui/form';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { FormField } from '@schema-engine/forms-radiant/primitives';

@customElement('example-stars')
export class ExampleStars extends FormAssociatedElement {
	declare readonly [JSX_PROPS]?: Partial<Pick<ExampleStars, 'name' | 'value' | 'max'>>;

	@prop({ type: Number, defaultValue: 0 }) value = 0;
	@prop({ type: Number, defaultValue: 5 }) max = 5;

	protected override formValue(): FormValue {
		return String(this.value);
	}

	protected override restoreFormState(state: FormValue): void {
		this.value = Number(state) || 0;
	}

	protected override onConnected(): void {
		super.onConnected();
		announceControlConnect(this);
	}

	private choose(value: number): void {
		this.value = value;
		this.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
		this.dispatchEvent(new Event('change', { bubbles: true }));
	}

	override render(): JsxRenderable {
		return (
			<fieldset>
				{Array.from({ length: this.max }, (_, index) => (
					<button
						type="button"
						aria-pressed={this.value === index + 1}
						aria-label={`${index + 1} stars`}
						on:click={() => this.choose(index + 1)}
					/>
				))}
			</fieldset>
		);
	}
}

registerFieldControl('example-stars', {
	read: (host) => (host as ExampleStars).value,
	write: (host, value) => {
		(host as ExampleStars).value = Number(value) || 0;
	},
	submission: 'none',
});

const StarsFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('stars'),
	max: z._default(z.number().check(z.int(), z.positive()), 5),
});

function StarsField(config: z.output<typeof StarsFieldSchema>) {
	return (
		<FormField name={config.name}>
			<RuiLabel htmlFor={config.id}>{config.label}</RuiLabel>
			<ExampleStars name={config.name} max={config.max} />
			<RuiFieldError />
		</FormField>
	);
}

export const starsFieldRegistration = defineInput({
	$type: 'stars',
	schema: StarsFieldSchema,
	metadata: { name: 'Stars', category: 'input' },
	value: (config) => z.number().check(z.int(), z.gte(1), z.lte(config.max)),
	render: StarsField,
});
```

## Native facts

What a control says about its own value reaches the container as a native fact, and it counts in `validate` and `checkValidity`.

- **A native `input`, `select` or `textarea` contributes one by default**: its `validity` (`valueMissing`, `typeMismatch`, `tooShort`, ...). React reports it from the element `fieldProps.ref` lands on, after each change, on blur and after each render, in both modes. Radiant UI's `rui-form` reports it for the controls inside its fields.
- **To contribute none**, give the control nothing to judge. In React, put `ref` on a wrapper that is not a native control (focus still works, as in the rating above), or leave the constraint attributes (`required`, `min`, `pattern`, a typed `type`) off the control. In Radiant, a form-associated custom host (`FormAssociatedElement`) reports its own `validity`, so it contributes a fact only when it sets invalidity: the stars host is form-associated and stays valid because it never sets any. The adapter can silence a host that does with `validity: () => undefined`.

A fact follows the form's validation timing, and the rule's error wins the display when both fail.

## Registering the widget

A registration is `defineInput({ $type, schema, metadata, value, render })`, and the schema is the widget's config: `z.extend(BaseFieldSchema, { $type: z.literal('...'), ...yours })`. `defineInput` keeps the schema's input and output apart, so authors write the input and `render` receives the output with defaults applied. `value` declares what the control writes, as a function of the configured element that returns a Standard Schema (the rating's `max` is its bound; a select's options are an enum): `defineInput` requires it, the engine checks every submission against it, and the type of `onSubmit` comes from it. The control writes exactly what it declares (a number option is a number, not its text), and a control that writes something else fails the submission with a `valueMismatch` issue at its path. A container widget declares `elements: elementChildrenSchema`, no `value` (its value is its children's), and renders its children with `FormElements`, which composes the paths at render time. A display-only element uses `defineStatic` and declares none. Pass the registration to the engine: `forms-react.md` shows the React engine, and here is the Radiant one.

```ts title="radiant/engine.ts"
import { createRadiantFormEngine } from '@schema-engine/forms-radiant';
import { starsFieldRegistration } from './stars-field';
import { textFieldRegistration } from './text-field';

export const engine = createRadiantFormEngine({ elements: [textFieldRegistration, starsFieldRegistration] });
```

Replacing a packaged widget is the same registration under the same `$type`, listed after it: the last one wins.

## Testing a widget

Test a widget through the real renderer and the form's own container, not a copy of them. A widget test covers four things: an uncontrolled widget renders zero times per keystroke once dirty, `reset` and `setValue` write back into the control, the error is shown and announced (`aria-invalid`, `aria-describedby` and the alert), and a native control's fact blocks the check. React runs under Testing Library in a browser project.

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

A Radiant widget is tested in a browser project too, with the container read through a `FormController`; the same cases apply, and the custom host is driven through the container and a click.

```ts title="radiant/text-field.browser.suite.ts"
import { createRoot } from '@ecopages/jsx/client';
import { afterEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FormRenderer } from '@schema-engine/forms-radiant';
import { containerOf } from './controller';
import { engine } from './engine';

const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Profile',
			elements: [
				{
					$type: 'text',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
				{ $type: 'stars', id: 'stars', name: 'stars', label: 'Stars' },
			],
		},
	],
});

afterEach(() => document.body.replaceChildren());

async function mount() {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(FormRenderer({ engine, config: profile }));
	await expect.poll(() => host.querySelector('rui-form')).toBeTruthy();
	const ruiForm = host.querySelector<HTMLElement>('rui-form')!;
	await expect.poll(() => containerOf(ruiForm)).toBeTruthy();
	return {
		container: containerOf(ruiForm)!,
		input: host.querySelector<HTMLInputElement>('input[name="email"]')!,
		star: (count: number) => host.querySelector<HTMLElement>(`[aria-label="${count} stars"]`)!,
	};
}

test('typing reaches the form, and reset and setValue in code write back into the control', async () => {
	const { container, input } = await mount();

	await userEvent.fill(input, 'ada@example.com');
	expect(container.getValue('email')).toBe('ada@example.com');

	container.reset();
	await expect.poll(() => input.value).toBe('');
	container.setValue('email', 'code@example.com');
	await expect.poll(() => input.value).toBe('code@example.com');
});

test('the error is shown and announced on the control', async () => {
	const { container, input } = await mount();

	expect(await container.validate()).toEqual({ outcome: 'invalid' });

	await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');
	const describedBy = input.getAttribute('aria-describedby');
	expect(document.getElementById(describedBy!)).toHaveTextContent('Email is required');
});

test('a native control reports what the browser says about its value', async () => {
	const { container, input } = await mount();

	await userEvent.fill(input, 'not an email');
	await container.validate(['email']);

	expect(container.getSnapshot().errors.email?.all).toContainEqual(
		expect.objectContaining({ type: 'typeMismatch', source: 'native' }),
	);
});

test('a custom host takes its value from the form and gives its changes back', async () => {
	const { container, star } = await mount();

	container.setValue('stars', 3);
	await expect.poll(() => star(3).getAttribute('aria-pressed')).toBe('true');

	await userEvent.click(star(5));
	expect(container.getValue('stars')).toBe(5);
	await expect.poll(() => star(5).getAttribute('aria-pressed')).toBe('true');

	container.reset();
	await expect.poll(() => star(5).getAttribute('aria-pressed')).toBe('false');
});
```

Save your copy as `text-field.browser.test.ts`; the `.suite` name only keeps this mirrored example out of this repository's own test runs.
