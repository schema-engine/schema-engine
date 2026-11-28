# Writing a Radiant widget

Task: add or change a field widget for the Radiant renderer, and test it. A widget is the render function of an element registration; the engine owns the state, so a widget only draws the field and the container hands the user's changes back. Registering it (`defineInput`) is in `forms.md`; the config shape and the container are there too.

A Radiant widget is a function component. It renders a `FormField` (the `se-field` host) around its label, its control and a `RuiFieldError`, and the control sits inside the field. The field finds its control by the `data-rui-control` marker on a native input (Radiant UI's inputs carry it) or by the tag of a custom host registered with `registerFieldControl`; it reads the control's value, writes the form's value back into it, and paints the label, error and ARIA state. The widget holds no state of its own.

```tsx title="radiant/text-field.tsx"
import * as z from 'zod/mini';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput, BaseFieldSchema } from '@schema-engine/forms';
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

## A custom host

A control that is not a native input is a custom host. It is a custom element registered with `registerFieldControl(tagName, { read, write, submission })` from `@ecopages/radiant-ui/form`: `read` returns the host's value, `write` sets it. When the user changes the value the host updates `value` first and then dispatches a bubbling, composed `input` event and, for a final change, a `change` event. A host must call `announceControlConnect(this)` when it connects, so a field that registered earlier seeds it with the value the form holds and reads its validity. Read and write the form from inside an element with a `FormController` (`forms-radiant.md`).

```tsx title="radiant/stars-field.tsx"
import * as z from 'zod/mini';
import { customElement, prop } from '@ecopages/radiant';
import { FormAssociatedElement, type FormValue } from '@ecopages/radiant/form-associated-element';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { announceControlConnect, registerFieldControl } from '@ecopages/radiant-ui/form';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput, BaseFieldSchema } from '@schema-engine/forms';
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

What a control says about its own value reaches the container as a native fact, and it counts in `validate` and `checkValidity`. A native `input`, `select` or `textarea` contributes one by default: Radiant UI's `rui-form` reports its `validity` for the controls inside its fields. A form-associated custom host (`FormAssociatedElement`) reports its own `validity`, so it contributes a fact only when it sets invalidity: the stars host is form-associated and stays valid because it never sets any. `registerFieldControl` can silence a host that does with `validity: () => undefined`. A fact follows the form's validation timing, and the rule's error wins the display when both fail.

## Registering the widget

Register the widget with `defineInput` (`forms.md`) and pass it to the engine. A Radiant engine is `createRadiantFormEngine`, which is `createFormEngine` with the Radiant recipes bound; the packaged widgets are `schemaFormRegistrations`, or the named registrations of `@schema-engine/forms-radiant/registrations`, each of which loads only its own widget (`forms-radiant.md`). Build your own registration the same way a packaged one is built: spread an element contract and add `render`, as `defineInput({ ...InputElementContract, render: TextField })` does.

```ts title="radiant/engine.ts"
import { createRadiantFormEngine } from '@schema-engine/forms-radiant';
import { starsFieldRegistration } from './stars-field';
import { textFieldRegistration } from './text-field';

export const engine = createRadiantFormEngine({ elements: [textFieldRegistration, starsFieldRegistration] });
```

Replacing a packaged widget is the same registration under the same `$type`, listed after it: the last one wins.

## Testing a widget

Test a widget in a browser project, through the real renderer and the form's own container read through a `FormController`, not a copy of them. A widget test covers: `reset` and `setValue` write back into the control, the error is shown and announced (`aria-invalid`, `aria-describedby`), a native control's fact blocks the check, and a custom host takes its value from the form and gives its changes back.

```ts title="radiant/text-field.browser.test.ts"
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
					rules: [{ $type: 'required', message: 'Email is required' }],
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

Save your copy as `text-field.browser.test.ts`.
