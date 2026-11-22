import { afterEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FormRenderer } from '@/components/internals/form-renderer';
import { containerOf } from './mount-field';

const created = vi.hoisted(() => ({ count: 0 }));

vi.mock('@schema-engine/forms/state-container', async (importOriginal) => {
	const original = await importOriginal<typeof import('@schema-engine/forms/state-container')>();
	return {
		...original,
		createFormStateContainer: (...args: Parameters<typeof original.createFormStateContainer>) => {
			created.count += 1;
			return original.createFormStateContainer(...args);
		},
	};
});

afterEach(() => document.body.replaceChildren());

test('a client render builds one container for the form, and none to compute a server payload', async () => {
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
	const host = document.createElement('div');
	document.body.append(host);
	const config = engine.validateForm({
		id: 'client',
		steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'input', id: 'name', name: 'name' }] }],
	});
	created.count = 0;

	createRoot(host).render(FormRenderer({ config, engine }));
	await expect.poll(() => host.querySelector('rui-form')).toBeTruthy();
	await expect.poll(() => containerOf(host.querySelector('rui-form')!)).toBeTruthy();

	expect(created.count).toBe(1);
});
