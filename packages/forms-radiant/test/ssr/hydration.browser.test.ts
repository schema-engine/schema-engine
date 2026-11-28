import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, expect, inject, test, vi } from 'vitest';
import { RuiFormElement } from '@ecopages/radiant-ui/form';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormFieldElement } from '@/elements/form-field';
import { FormRendererElement } from '@/components/internals/form-renderer.script';
import { createHydrationEngine } from './hydration-engine';
import { testAction } from '../adapters/test-actions';

import { containerOf as readContainer } from '../components/mount-field';
import { FormController } from '@/adapters/radiant/controller';

await Promise.all([
	import('@/elements/inputs/form-textarea'),
	import('@/elements/inputs/form-select'),
	import('@/elements/inputs/form-checkbox'),
	import('@/elements/inputs/form-slider'),
	import('@/elements/inputs/form-input'),
	import('@/elements/inputs/form-phone-input'),
]);

function mount({
	bindBeforeUpgrade = false,
	submit,
}: { bindBeforeUpgrade?: boolean; submit?: Parameters<typeof createHydrationEngine>[0] } = {}) {
	const engine = createHydrationEngine(submit);
	const owner = bindBeforeUpgrade ? document.implementation.createHTMLDocument() : document;
	const renderer = owner.createElement('se-form-renderer') as FormRendererElement;
	renderer.engine = engine;
	const root = owner.createElement('div');
	root.innerHTML = atob(inject('ssrHydrationHtml'));
	renderer.append(root);
	document.body.append(renderer);
	return {
		root,
		engine,
		renderer,
		instance: root.querySelector('se-form-instance') as FormInstanceElement,
		form: root.querySelector('rui-form') as RuiFormElement,
	};
}

const warn = vi.spyOn(console, 'warn');

beforeEach(() => {
	warn.mockClear();
});

afterEach(() => {
	const engineWarnings = warn.mock.calls.filter((call) =>
		String(call.at(-1)).includes('Could not resolve FormEngine'),
	);
	document.body.replaceChildren();
	vi.restoreAllMocks();
	expect(engineWarnings).toEqual([]);
});

const containerOf = async (field: HTMLElement) => {
	await expect.poll(() => new FormController(field).container).toBeTruthy();
	return readContainer(field);
};

test.each(['confirm', 'choice', 'accepted', 'amount'])(
	'a cross-field rule on hydrated %s reports its message',
	async (name) => {
		const { root } = mount();
		const field = root.querySelector(`se-field[name="${name}"]`) as FormFieldElement;
		const container = await containerOf(field);
		const mismatch = name === 'amount' ? 7 : 'different';
		container.setValue('password', 'secret');
		if (name === 'confirm') {
			await userEvent.fill(field.querySelector('textarea')!, 'different');
		} else {
			container.setValue(name, mismatch);
		}
		await container.validate([name]);
		expect(container.getSnapshot().errors[name]?.message).toBe('Must match password');
		root.remove();
		document.body.append(root);
		const reconnected = await containerOf(field);
		expect(reconnected).toBe(container);
		reconnected.setValue('password', 'changed');
		reconnected.setValue(name, mismatch);
		await reconnected.validate([name]);
		expect(reconnected.getSnapshot().errors[name]?.message).toBe('Must match password');
	},
);

test('a hydrated form validates with the engine bound before upgrade', async () => {
	const { root } = mount({ bindBeforeUpgrade: true });
	const field = root.querySelector('se-field[name="confirm"]') as FormFieldElement;
	const container = await containerOf(field);
	container.setValue('password', 'secret');
	container.setValue('confirm', 'different');
	await container.validate(['confirm']);
	expect(container.getSnapshot().errors.confirm?.message).toBe('Must match password');
});

test('hydrated submit delivers the nested value tree', async () => {
	const { form } = mount();
	const field = form.querySelector('se-field[name="address.street"]') as FormFieldElement;
	const container = await containerOf(field);
	await userEvent.fill(field.querySelector('input')!, 'x');

	const result = await container.submit();

	expect(result.outcome).toBe('passed');
	expect(result.outcome === 'passed' && result.values).toMatchObject({ address: { street: 'x' } });
});

test('a hydrated form without onSubmit submits natively', async () => {
	const { form } = mount();
	await containerOf(form.querySelector('se-field') as FormFieldElement);
	form.action = '/native';
	const nativeSubmit = vi.spyOn(form.querySelector('form')!, 'submit').mockImplementation(() => {});

	form.querySelector('form')!.requestSubmit();

	await expect.poll(() => nativeSubmit.mock.calls.length).toBe(1);
});

test.each([false, true])('native submission waits for successful actions (%s)', async (succeeded) => {
	const execute = vi.fn(async () => (succeeded ? { success: true } : { success: false, shouldContinue: false }));
	const { engine, instance, form } = mount({
		submit: testAction('submit', ['form_mount', 'form_submit'], execute),
	});
	form.action = '/native';
	const nativeForm = form.querySelector<HTMLFormElement>('form[data-ref="form"]')!;
	const nativeSubmit = vi.spyOn(nativeForm, 'submit').mockImplementation(() => {});
	const complete = vi.fn();
	form.addEventListener('se-action-submit-complete', complete);
	instance.config = engine.defineForm({
		id: 'native-action-submit',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	await expect.poll(() => execute.mock.calls.length).toBe(1);

	nativeForm.requestSubmit();
	await expect.poll(() => complete.mock.calls.length).toBe(1);

	expect(complete.mock.calls[0]?.[0].detail.succeeded).toBe(succeeded);
	expect(nativeSubmit).toHaveBeenCalledTimes(succeeded ? 1 : 0);
});

test('form_change runs for a nested value tree, and a reconnect adds no duplicate watcher', async () => {
	const seen: Array<Record<string, unknown>> = [];
	const execute = vi.fn(async (context: { formData: Record<string, unknown> }) => {
		seen.push(context.formData);
		return { success: true };
	});
	const { engine, instance, root } = mount({ submit: testAction('submit', ['form_change'], execute) });
	instance.config = engine.defineForm({
		id: 'changes',
		steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'textarea', id: 'street', name: 'address.street' }] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	const field = root.querySelector('se-field[name="address.street"]') as FormFieldElement;
	await expect.poll(() => new FormController(field).container).toBeTruthy();
	await userEvent.fill(field.querySelector('input')!, 'changed');
	await expect.poll(() => seen.at(-1)?.address).toEqual({ street: 'changed' });
	root.remove();
	document.body.append(root);
	await expect.poll(() => new FormController(field).container).toBeTruthy();
	seen.length = 0;
	readContainer(field).setValue('address.street', 'reconnected');
	await expect.poll(() => seen.at(-1)?.address).toEqual({ street: 'reconnected' });
	expect(seen.filter((values) => (values.address as { street?: string })?.street === 'reconnected')).toHaveLength(1);
});

test.each([
	['contact', 'not an email', 'email'],
	['phone', '+1555', 'phone'],
])('hydrated %s reports the rule its registration attaches by default', async (name, value, type) => {
	const { root } = mount();
	const field = root.querySelector(`se-field[name="${name}"]`) as FormFieldElement;
	const container = await containerOf(field);
	container.setValue(name, value);
	await container.validate([name]);
	expect(container.getSnapshot().errors[name]?.type).toBe(type);
});

test('a hydrated constraint host keeps its server node and follows the form values', async () => {
	const { root } = mount();
	const wrapper = root.querySelector<HTMLElement>('se-constraint[data-se-constraint-field="vat"]')!;
	const field = wrapper.querySelector('se-field[name="vat"]') as FormFieldElement;
	expect(wrapper.hidden).toBe(true);
	await expect.poll(() => new FormController(field).container).toBeTruthy();
	expect(wrapper.hidden).toBe(true);
	expect(root.querySelector('se-constraint[data-se-constraint-field="vat"]')).toBe(wrapper);

	readContainer(field).setValue('contact', 'show');
	await expect.poll(() => wrapper.hidden).toBe(false);
	readContainer(field).setValue('contact', 'other');
	await expect.poll(() => wrapper.hidden).toBe(true);
});
