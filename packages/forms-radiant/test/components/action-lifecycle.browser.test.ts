import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormStore } from '@ecopages/radiant-ui/form';
import { FormActionControllerElement } from '@/components/form-action-controller';
import { provideTestFormStore } from '../adapters/test-form';

afterEach(() => document.body.replaceChildren());

test('submission action callback receives the successful action and nested values in lifecycle order', async () => {
	const engine = createFormEngine({ elements: [] });
	const events: string[] = [];
	const execute = vi.fn(async () => ({ success: true }));
	vi.spyOn(engine, 'getAction').mockReturnValue({
		$type: 'submit',
		schema: { '~standard': { version: 1, vendor: 'test', validate: (value: unknown) => ({ value }) } },
		metadata: { name: 'Submit', defaultTriggers: ['form_submit'] },
		execute,
	});
	const host = document.createElement('rui-form');
	const store = new FormStore({ defaultValues: { 'address.street': 'Main' } });
	provideTestFormStore(host, store);
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = engine.defineForm({
		id: 'actions',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'save', $type: 'submit', endpoint: '/save' }],
	});
	controller.onAction = vi.fn(async (action, values) => {
		events.push('callback');
		expect(action.id).toBe('save');
		expect(values).toEqual({ address: { street: 'Main' } });
	});
	host.addEventListener('se-action-submit-start', () => events.push('start'));
	host.addEventListener('se-action-submit-complete', () => events.push('complete'));
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);
	const ready = vi.spyOn(controller.form, 'ready', 'get').mockReturnValue(false);
	host.dispatchEvent(new CustomEvent('rui-submit'));
	expect(events).toEqual([]);
	ready.mockRestore();
	host.dispatchEvent(new CustomEvent('rui-submit'));
	await expect.poll(() => events).toEqual(['start', 'callback', 'complete']);
	expect(controller.onAction).toHaveBeenCalledTimes(1);
	expect(execute.mock.calls.at(-1)?.[0]).toMatchObject({
		trigger: 'form_submit',
		formData: { address: { street: 'Main' } },
	});
});

test('refreshes action context between submission triggers and keeps form operations stable', async () => {
	const engine = createFormEngine({ elements: [] });
	const observed: Array<{ trigger: string; formData: Record<string, unknown>; form: unknown }> = [];
	vi.spyOn(engine, 'getAction').mockReturnValue({
		$type: 'submit',
		schema: { '~standard': { version: 1, vendor: 'test', validate: (value: unknown) => ({ value }) } },
		metadata: { name: 'Submit', defaultTriggers: ['form_submit_start', 'form_submit'] },
		execute: async ({
			trigger,
			formData,
			form,
		}: {
			trigger: string;
			formData: Record<string, unknown>;
			form: { setValue: (name: string, value: unknown) => void };
		}) => {
			observed.push({ trigger, formData, form });
			if (trigger === 'form_submit_start') form.setValue('status', 'prepared');
			return { success: true };
		},
	});
	const host = document.createElement('rui-form');
	provideTestFormStore(host, new FormStore({ defaultValues: { status: 'draft' } }));
	const controller = new FormActionControllerElement();
	controller.engine = engine;
	controller.config = engine.defineForm({
		id: 'fresh-submit-context',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'prepare', $type: 'submit', endpoint: '/save' }],
	});
	const complete = vi.fn();
	host.addEventListener('se-action-submit-complete', complete);
	host.append(controller);
	document.body.append(host);
	await expect.poll(() => controller.form.ready).toBe(true);
	host.dispatchEvent(new CustomEvent('rui-submit'));
	await expect.poll(() => complete.mock.calls.length).toBe(1);

	expect(observed.map(({ trigger }) => trigger)).toEqual(['form_submit_start', 'form_submit']);
	expect(observed[1]?.formData).toEqual({ status: 'prepared' });
	expect(observed[1]?.form).toBe(observed[0]?.form);
});

test.each([false, true])(
	'a stopping failure settles the lifecycle (callback rejection: %s)',
	async (callbackRejects) => {
		const engine = createFormEngine({ elements: [] });
		const executed: string[] = [];
		vi.spyOn(engine, 'getAction').mockReturnValue({
			$type: 'submit',
			schema: { '~standard': { version: 1, vendor: 'test', validate: (value: unknown) => ({ value }) } },
			metadata: { name: 'Submit', defaultTriggers: ['form_submit'] },
			execute: async ({ config }: { config: { id: string } }) => {
				executed.push(config.id);
				return callbackRejects ? { success: true } : { success: false, shouldContinue: false };
			},
		});
		const host = document.createElement('rui-form');
		provideTestFormStore(host, new FormStore());
		const controller = new FormActionControllerElement();
		controller.engine = engine;
		controller.config = engine.defineForm({
			id: 'failure',
			steps: [{ id: 'main', title: 'Main', elements: [] }],
			actions: [
				{ id: 'first', $type: 'submit', endpoint: '/save' },
				{ id: 'second', $type: 'submit', endpoint: '/save' },
			],
		});
		controller.onAction = vi.fn(async () => {
			throw new Error('callback failure');
		});
		const complete = vi.fn();
		host.addEventListener('se-action-submit-complete', complete);
		host.append(controller);
		document.body.append(host);
		await expect.poll(() => controller.form.ready).toBe(true);
		host.dispatchEvent(new CustomEvent('rui-submit'));
		await expect.poll(() => complete.mock.calls.length).toBe(1);
		expect(executed).toEqual(['first']);
		expect(controller.onAction).toHaveBeenCalledTimes(callbackRejects ? 1 : 0);
		expect(complete.mock.calls[0]?.[0].detail.succeeded).toBe(false);
	},
);
