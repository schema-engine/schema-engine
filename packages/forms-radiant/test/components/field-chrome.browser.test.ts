import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx/client';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FieldGroup } from '@/elements/field-group';
import type { FormFieldElement } from '@/elements/form-field';
import { InputFieldExtensionSchema } from '@/elements/inputs/form-input.types';
import { TextareaFieldExtensionSchema } from '@/elements/inputs/form-textarea.types';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { mountField } from './mount-field';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

async function mountElements(elements: Record<string, unknown>[]) {
	const host = document.createElement('div');
	document.body.append(host);
	const config = { id: 'chrome', steps: [{ id: 'main', title: 'Main', elements }] };
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine }));
	await expect.poll(() => host.querySelector('se-field, se-form-array')).toBeTruthy();
	return host;
}

test('a field without a label has an accessible name and no visible label', async () => {
	const { host } = await mountField({ $type: 'input', id: 'email', name: 'email' });

	await expect.element(page.getByRole('textbox', { name: 'email' })).toBeInTheDocument();
	const label = host.querySelector<HTMLElement>('label')!;
	expect(label.classList.contains('se-visually-hidden')).toBe(true);
	expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
});

test('every input config key reaches the rendered input', async () => {
	const config = {
		inputType: 'text',
		autoComplete: 'one-time-code',
		autoFocus: true,
		inputMode: 'numeric',
		spellCheck: false,
	} satisfies Record<keyof typeof InputFieldExtensionSchema.shape, unknown>;
	const { host } = await mountField({ $type: 'input', id: 'otp', name: 'otp', label: 'Code', ...config });
	const input = host.querySelector('input')!;

	expect(input.getAttribute('autocomplete')).toBe('one-time-code');
	expect(input.hasAttribute('autofocus')).toBe(true);
	expect(input.getAttribute('inputmode')).toBe('numeric');
	expect(input.getAttribute('spellcheck')).toBe('false');
	expect(input.getAttribute('type')).toBe('text');
});

test('every textarea config key reaches the rendered textarea', async () => {
	const config = {
		rows: 4,
		cols: 30,
		resize: 'none',
		spellCheck: false,
		wrap: 'hard',
	} satisfies Record<keyof typeof TextareaFieldExtensionSchema.shape, unknown>;
	const { host } = await mountField({ $type: 'textarea', id: 'bio', name: 'bio', label: 'Bio', ...config });
	const textarea = host.querySelector('textarea')!;

	expect(textarea.rows).toBe(4);
	expect(textarea.cols).toBe(30);
	expect(textarea.getAttribute('wrap')).toBe('hard');
	expect(textarea.getAttribute('spellcheck')).toBe('false');
	expect(getComputedStyle(textarea).resize).toBe('none');
});

test('a class passed to a field group survives on the field host', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const config = { id: 'class', steps: [{ id: 'main', title: 'Main', elements: [] }] };
	const field = renderWithOwningFormEngine(engine, () =>
		FieldGroup({
			name: 'a',
			label: 'A',
			class: 'wide',
			children: jsx('input', { name: 'a', 'data-rui-control': '' }),
		}),
	);
	createRoot(host).render(jsx(ConfiguredRuiForm, { config, children: field }));
	await expect.poll(() => host.querySelector('se-field')).toBeTruthy();
	const element = host.querySelector('se-field')!;

	expect(element.classList.contains('se-form-field')).toBe(true);
	expect(element.classList.contains('wide')).toBe(true);
});

test('array rows sit in a named group with row-specific remove buttons', async () => {
	const host = await mountElements([
		{
			$type: 'arrayElements',
			name: 'contacts',
			label: 'Contacts',
			defaultValue: ['a', 'b'],
			elements: [{ $type: 'input', name: 'item', label: 'Item' }],
		},
	]);

	await expect.element(page.getByRole('group', { name: /^Contacts/ })).toBeInTheDocument();
	await expect.poll(() => host.querySelectorAll('.se-form-array__remove')).toHaveLength(2);
	const names = [...host.querySelectorAll('.se-form-array__remove')].map((button) =>
		button.getAttribute('aria-label'),
	);
	expect(new Set(names).size).toBe(2);
});

test('an array error is shown with its message and the group is described by it', async () => {
	const host = await mountElements([
		{
			$type: 'arrayElements',
			id: 'contacts',
			name: 'contacts',
			label: 'Contacts',
			rules: [{ type: 'required', message: 'Add at least one contact' }],
			elements: [{ $type: 'input', name: 'item', label: 'Item' }],
		},
		{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
	]);
	const group = host.querySelector('fieldset')!;
	const region = host.querySelector<HTMLElement>('.se-form-array [data-rui-field-error]')!;
	expect(region.hidden).toBe(true);
	expect(group.hasAttribute('aria-describedby')).toBe(false);

	await userEvent.click(page.getByRole('button', { name: 'Send' }).element());

	await expect.poll(() => region.hidden).toBe(false);
	expect(region.textContent).toBe('Add at least one contact');
	expect(group.getAttribute('aria-describedby')).toBe(region.id);
	expect(region.id).not.toBe('');
});

test('the drop zone shows a focus indicator when tabbed to', async () => {
	const { host } = await mountField({ $type: 'drop-zone', id: 'files', name: 'files', label: 'Files' });
	await expect.poll(() => host.querySelector('se-drop-zone input')).toBeTruthy();

	await userEvent.tab();

	const input = host.querySelector<HTMLInputElement>('se-drop-zone input')!;
	await expect.poll(() => document.activeElement).toBe(input);
	expect(getComputedStyle(host.querySelector('.se-dropzone')!).outlineStyle).toBe('solid');
});

test('a constraint-required choice shows the required marker', async () => {
	const host = await mountElements([
		{
			$type: 'radio',
			id: 'plan',
			name: 'plan',
			label: 'Plan',
			options: [
				{ value: 'free', label: 'Free' },
				{ value: 'paid', label: 'Paid' },
			],
			constraints: [{ field: 'toggle', operator: 'equals', value: 'on', action: 'require' }],
		},
		{ $type: 'input', id: 'toggle', name: 'toggle', label: 'Toggle' },
	]);
	const fields = [...host.querySelectorAll<FormFieldElement>('se-field')];
	const plan = fields.find((field) => field.name === 'plan')!;
	const marker = plan.querySelector('[data-se-required-marker]')!;
	expect(marker.hasAttribute('hidden')).toBe(true);

	await userEvent.fill(host.querySelector<HTMLInputElement>('input[name="toggle"]')!, 'on');

	await expect.poll(() => marker.hasAttribute('hidden')).toBe(false);
});
