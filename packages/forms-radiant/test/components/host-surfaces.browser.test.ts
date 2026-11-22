import { afterEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { SplitScreenSideElement } from '@/components/shells/shells';
import type { FormFieldElement } from '@/elements/form-field';
import { FormController } from '@/adapters/radiant/controller';
import { containerOf } from './mount-field';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

afterEach(() => document.body.replaceChildren());

test('a split-screen side without meta renders its children and no slot element', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(jsx(SplitScreenSideElement, { children: jsx('p', { children: 'Side copy' }) }));
	await expect.poll(() => host.querySelector('se-split-screen-side p')?.textContent).toBe('Side copy');

	expect(host.querySelector('slot')).toBeNull();
});

test('fields do not request an update when another field changes', async () => {
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
	const host = document.createElement('div');
	document.body.append(host);
	const elements = ['a', 'b', 'c'].map((name) => ({ $type: 'input', id: name, name, label: name }));
	const config = { id: 'surfaces', steps: [{ id: 'main', title: 'Main', elements }] };
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine }));
	await expect.poll(() => host.querySelectorAll('se-field')).toHaveLength(3);
	const [first, ...others] = [...host.querySelectorAll<FormFieldElement>('se-field')];
	const form = new FormController(first!);
	await expect.poll(() => form.container).toBeTruthy();
	const updates = others.map((field) => vi.spyOn(field, 'requestUpdate'));

	containerOf(first!).setValue('a', 'changed');
	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(updates.map((spy) => spy.mock.calls.length)).toEqual([0, 0]);
});
