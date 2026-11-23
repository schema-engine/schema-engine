import '@ecopages/radiant/client/install-hydrator';
import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@/styles/hosts.css';
import { afterEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { containerOf, mountField } from './mount-field';

const loader = vi.hoisted(() => ({ release: () => {}, gate: Promise.resolve() }));

vi.mock('@/lib/mask-options', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/lib/mask-options')>();
	return { ...original, loadIMask: () => loader.gate.then(() => original.loadIMask()) };
});

afterEach(() => document.body.replaceChildren());

test('text typed before the mask loads is masked, reported to the form and kept', async () => {
	const { promise, resolve } = Promise.withResolvers<void>();
	loader.gate = promise;
	const { host, field } = await mountField({
		$type: 'masked-input',
		id: 'zip',
		name: 'zip',
		label: 'Zip',
		mask: '000-00',
	});
	const input = host.querySelector<HTMLInputElement>('se-masked-input input')!;
	expect(host.querySelector('se-masked-input[data-ready]')).toBeNull();
	const changes = vi.fn();
	host.querySelector('se-masked-input')!.addEventListener('input', changes);

	await userEvent.type(input, '12345');
	resolve();

	await expect.poll(() => host.querySelector('se-masked-input[data-ready]')).toBeTruthy();
	expect(input.value).toBe('123-45');
	expect(containerOf(field).getValue('zip')).toBe('123-45');
	expect(changes).toHaveBeenCalled();
});
