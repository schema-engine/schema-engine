import { afterEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FormRenderer } from '@/components/internals/form-renderer';
import { containerOf } from './mount-field';

const created = vi.hoisted(() => ({ containers: 0, runtimes: 0 }));

vi.mock('@schema-engine/forms/state-container', async (importOriginal) => {
	const original = await importOriginal<typeof import('@schema-engine/forms/state-container')>();
	return {
		...original,
		createFormStateContainer: (...args: Parameters<typeof original.createFormStateContainer>) => {
			created.containers += 1;
			return original.createFormStateContainer(...args);
		},
	};
});

vi.mock('@schema-engine/forms', async (importOriginal) => {
	const original = await importOriginal<typeof import('@schema-engine/forms')>();
	return {
		...original,
		createFormRuntime: (...args: Parameters<typeof original.createFormRuntime>) => {
			created.runtimes += 1;
			return original.createFormRuntime(...args);
		},
	};
});

afterEach(() => document.body.replaceChildren());

test('a client render builds one runtime, which owns the form container, and no other container to compute a server payload', async () => {
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
	const host = document.createElement('div');
	document.body.append(host);
	const config = engine.validateForm({
		id: 'client',
		steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'input', id: 'name', name: 'name' }] }],
	});
	created.containers = 0;
	created.runtimes = 0;

	createRoot(host).render(FormRenderer({ config, engine }));
	await expect.poll(() => host.querySelector('rui-form')).toBeTruthy();
	await expect.poll(() => containerOf(host.querySelector('rui-form')!)).toBeTruthy();

	expect(created).toEqual({ containers: 0, runtimes: 1 });
});
