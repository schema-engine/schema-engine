import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { FormField, type FormFieldElement } from '@/elements/form-field';

afterEach(() => document.body.replaceChildren());

const config = { id: 'required-field', steps: [{ id: 'main', title: 'Main', elements: [] }] };

function mountField(required: boolean) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(
		jsx(ConfiguredRuiForm, {
			config,
			children: FormField({
				name: 'email',
				required,
				children: jsx('input', { name: 'email', 'data-rui-control': '', 'data-rui-control-type': 'text' }),
			}),
		}),
	);
	return { host, root, field: () => host.querySelector<FormFieldElement>('se-field')! };
}

test('a field the config requires announces it and says so as an attribute for hydration', async () => {
	const { host, root, field } = mountField(true);
	try {
		await expect.poll(() => field().rules?.required).toBe(true);
		expect(field().hasAttribute('data-se-required')).toBe(true);
		await expect.poll(() => host.querySelector('input')?.getAttribute('aria-required')).toBe('true');
	} finally {
		root.unmount();
	}
});

test('a field the config does not require announces nothing and carries no rules', async () => {
	const { host, root, field } = mountField(false);
	try {
		await expect.poll(() => host.querySelector('input')?.getAttribute('aria-invalid')).toBe('false');
		expect(field().rules).toBeFalsy();
		expect(field().hasAttribute('data-se-required')).toBe(false);
		expect(host.querySelector('input')?.hasAttribute('aria-required')).toBe(false);
	} finally {
		root.unmount();
	}
});

test('a field restores its required state from the attribute when the rules property did not survive', async () => {
	const host = document.createElement('div');
	host.innerHTML = `<rui-form><form data-ref="form" novalidate><se-field name="email" data-se-required><input name="email" data-rui-control /></se-field></form></rui-form>`;
	document.body.append(host);
	const field = host.querySelector<FormFieldElement>('se-field')!;
	await expect.poll(() => field.rules?.required).toBe(true);
});
