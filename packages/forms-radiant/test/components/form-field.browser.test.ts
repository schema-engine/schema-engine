import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { FormField, type FormFieldElement } from '@/elements/form-field';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';
import { createRadiantFormEngine } from '@/registries/builder-registry';

import { formOf } from './mount-field';

afterEach(() => document.body.replaceChildren());

test('a FormField validate prop runs after the rules derived from its validation config', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = { id: 'custom-validate', steps: [{ id: 'main', title: 'Main', elements: [] }] };
	const field = renderWithOwningFormEngine(createRadiantFormEngine(), () =>
		FormField({
			name: 'email',
			validation: { name: 'email', rules: [{ type: 'email', message: 'Enter an email' }] },
			validate: (value) => !String(value).endsWith('@example.test') || 'No test addresses',
			children: jsx('input', { name: 'email', 'data-rui-control': '', 'data-rui-control-type': 'text' }),
		}),
	);
	root.render(jsx(ConfiguredRuiForm, { config, children: field }));
	const element = host.querySelector('se-field') as FormFieldElement;
	await expect.poll(() => formOf(element).ready).toBe(true);
	const store = formOf(element).store!;
	const errorFor = async (value: string) => {
		store.setValue('email', value);
		await store.validateField('email');
		return store.getState().errors.email?.message;
	};

	try {
		expect(await errorFor('not-an-email')).toBe('Enter an email');
		expect(await errorFor('@example.test')).toBe('Enter an email');
		expect(await errorFor('ada@example.test')).toBe('No test addresses');
		expect(await errorFor('ada@example.com')).toBeUndefined();
	} finally {
		root.unmount();
	}
});
