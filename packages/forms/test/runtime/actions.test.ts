import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { createFormRuntime } from '@/runtime';
import { defineInput } from '@/types';
import type { BuilderActionBaseContext } from '@/types';
import { anyValue } from '../lib/any-value';

type Seen = BuilderActionBaseContext & { trigger: string; config: { id: string } };

/** An engine whose `record` action keeps every context it ran with, and answers as a test says. */
function setup(
	actions: ReadonlyArray<Record<string, unknown>>,
	options: {
		fields?: ReadonlyArray<Record<string, unknown>>;
		defaults?: Record<string, unknown>;
		answer?: (context: Seen) => { success: boolean; shouldContinue?: boolean } | void | Promise<void>;
		onAction?: (action: { id: string }, data: unknown) => void | Promise<void>;
	} = {},
) {
	const seen: Seen[] = [];
	const engine = createFormEngine({
		elements: [
			defineInput({
				value: anyValue,
				$type: 'input',
				schema: z.looseObject({ $type: z.literal('input'), name: z.string() }),
				metadata: { name: 'Input', category: 'input' },
				render: (_props: Record<string, unknown>) => null,
			}),
		],
		actions: [
			{
				$type: 'record',
				schema: z.looseObject({}),
				metadata: { name: 'Record' },
				execute: async (context: Seen) => {
					seen.push(context);
					return (await options.answer?.(context)) ?? { success: true };
				},
			},
		],
	});
	const host = { focus: vi.fn(), sync: vi.fn() };
	const runtime = createFormRuntime({
		engine,
		config: engine.validateForm({
			id: 'actions',
			steps: [{ id: 'main', title: 'Main', elements: options.fields ?? [] }],
			actions,
		}),
		defaults: options.defaults,
		host,
		onAction: options.onAction,
	});
	runtime.mount();
	return { engine, runtime, seen, host };
}

const record = (id: string, triggers: string[]) => ({ $type: 'record', id, triggers });

describe('the action context', () => {
	test('carries the container values, flat errors by path, isValid of the recorded errors and the submissions that ended', async () => {
		const { runtime, seen } = setup([record('audit', ['form_change'])], {
			fields: [{ $type: 'input', name: 'email', rules: [{ $type: 'required', message: 'Required' }] }],
			defaults: { email: '' },
		});
		await runtime.container.validate();
		runtime.container.blur('email');
		runtime.container.setValue('email', '');
		runtime.container.setValue('other', 'x');
		await vi.waitFor(() => expect(seen).toHaveLength(1));

		const context = seen[0]!;
		expect(context.errors).toEqual({ email: expect.objectContaining({ type: 'required', message: 'Required' }) });
		expect(context.isValid).toBe(false);
		expect(context.formData).toMatchObject({ email: '' });
		expect(context.metadata.userInteractions).toBe(1);
	});

	test('hands actions the fetch of the engine', async () => {
		const { engine, seen } = setup([record('mount', ['form_mount'])]);
		await vi.waitFor(() => expect(seen).toHaveLength(1));
		expect(seen[0]?.fetch).toBe(engine.fetch);
	});

	test('reports recorded errors as isValid and checks validity without recording any', async () => {
		const { runtime, seen, host } = setup([record('audit', ['form_change'])], {
			fields: [{ $type: 'input', name: 'email', rules: [{ $type: 'required' }] }],
			defaults: { email: 'a@b.co' },
		});
		runtime.container.setValue('email', '');
		await vi.waitFor(() => expect(seen).toHaveLength(1));

		expect(seen[0]?.isValid).toBe(true);
		await expect(seen[0]?.form.checkValidity()).resolves.toBe(false);
		expect(host.sync).toHaveBeenCalled();
		expect(runtime.container.getSnapshot().errors).toEqual({});
	});

	test('is refreshed between triggers, and keeps its form operations', async () => {
		const { runtime, seen } = setup([record('prepare', ['form_submit_start', 'form_submit'])], {
			fields: [{ $type: 'input', name: 'status' }],
			defaults: { status: 'draft' },
			answer: ({ trigger, form }) => {
				if (trigger === 'form_submit_start') form.setValue('status', 'prepared');
			},
		});

		await runtime.submit();

		expect(seen.map(({ trigger }) => trigger)).toEqual(['form_submit_start', 'form_submit']);
		expect(seen[0]?.formData).toEqual({ status: 'draft' });
		expect(seen[1]?.form).toBe(seen[0]?.form);
		expect(seen[1]?.form.getValue('status')).toBe('prepared');
	});

	test('form.reset resets the runtime (the defaults, the submission and the count) without keeping form_submit_complete from running', async () => {
		const { runtime, seen } = setup(
			[record('reset', ['form_submit_success']), record('done', ['form_submit_complete'])],
			{
				fields: [{ $type: 'input', name: 'email' }],
				defaults: { email: 'a' },
				answer: ({ trigger, form }) => {
					if (trigger === 'form_submit_success') form.reset();
				},
			},
		);
		runtime.container.setValue('email', 'b');

		expect(await runtime.submit()).toBe('submitted');

		expect(seen.map(({ trigger }) => trigger)).toEqual(['form_submit_success', 'form_submit_complete']);
		expect(runtime.container.getValue('email')).toBe('a');
		expect(runtime.getSnapshot().submission).toEqual({ status: 'success', failures: [], submitCount: 1 });
	});
});

describe('the submit lifecycle', () => {
	test('gives onAction each successful action with the nested values, in lifecycle order', async () => {
		const events: string[] = [];
		const onAction = vi.fn(async () => {
			events.push('callback');
		});
		const { runtime, seen } = setup([record('save', ['form_submit'])], {
			fields: [{ $type: 'input', name: 'address.street' }],
			defaults: { address: { street: 'Main' } },
			onAction,
			answer: ({ trigger }) => void events.push(trigger),
		});

		expect(await runtime.submit()).toBe('submitted');

		expect(events).toEqual(['form_submit', 'callback']);
		expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'save' }), { address: { street: 'Main' } });
		expect(seen.at(-1)).toMatchObject({ trigger: 'form_submit', formData: { address: { street: 'Main' } } });
	});

	test('a stopping failure ends the lifecycle at that action, whichever way it fails', async () => {
		for (const callbackRejects of [false, true]) {
			const onAction = vi.fn(async () => {
				throw new Error('callback failure');
			});
			const { runtime, seen } = setup([record('first', ['form_submit']), record('second', ['form_submit'])], {
				onAction,
				answer: () => (callbackRejects ? { success: true } : { success: false, shouldContinue: false }),
			});

			expect(await runtime.submit()).toBe('failed');

			expect(seen.map(({ config }) => config.id)).toEqual(['first']);
			expect(onAction).toHaveBeenCalledTimes(callbackRejects ? 1 : 0);
			expect(runtime.getSnapshot().submission).toMatchObject({
				status: 'error',
				failures: [{ type: 'actionFailed', source: 'submission', params: { actionId: 'first' } }],
			});
		}
	});

	test('reports the outcomes of grouped submit actions once, under form_submit', async () => {
		const reported: Array<[string, string[]]> = [];
		const seen: string[] = [];
		const engine = createFormEngine({
			actions: [
				{
					$type: 'record',
					schema: z.looseObject({}),
					metadata: { name: 'Record' },
					execute: async (context: Seen) => {
						seen.push(context.config.id);
						return context.config.id === 'bad' ? { success: false, error: 'No' } : { success: true };
					},
				},
			],
		});
		const runtime = createFormRuntime({
			engine,
			config: engine.validateForm({
				id: 'grouped',
				steps: [{ id: 'main', title: 'Main', elements: [] }],
				actions: [[record('ok', ['form_submit']), record('bad', ['form_submit'])]],
			}),
			host: { focus: vi.fn() },
			onActionResults: (results, trigger) =>
				void reported.push([trigger, results.map(({ actionId }) => actionId)]),
		});

		await runtime.submit();

		expect(seen.toSorted()).toEqual(['bad', 'ok']);
		expect(reported.filter(([trigger]) => trigger === 'form_submit')).toEqual([['form_submit', ['ok', 'bad']]]);
	});
});

describe('mounting', () => {
	test('reports a value written before the runtime mounted, and the baseline is the one the form started from', () => {
		const onChange = vi.fn();
		const engine = createFormEngine({});
		const runtime = createFormRuntime({
			engine,
			config: engine.validateForm({ id: 'early', steps: [{ id: 'main', title: 'Main', elements: [] }] }),
			host: { focus: vi.fn() },
			onChange,
		});
		runtime.container.setValue('written', 'early');
		expect(onChange).not.toHaveBeenCalled();

		runtime.mount();

		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({ written: 'early' });
	});

	test('a step action answers the triggers of its own step only', async () => {
		const seen: string[] = [];
		const engine = createFormEngine({
			actions: [
				{
					$type: 'record',
					schema: z.looseObject({}),
					metadata: { name: 'Record' },
					execute: async (context: Seen) => {
						seen.push(`${context.config.id}:${context.trigger}`);
						return { success: true };
					},
				},
			],
		});
		const runtime = createFormRuntime({
			engine,
			config: engine.validateForm({
				id: 'scoped',
				steps: [
					{ id: 'one', title: 'One', elements: [], actions: [record('one', ['form_change'])] },
					{ id: 'two', title: 'Two', elements: [], actions: [record('two', ['form_change'])] },
				],
			}),
			host: { focus: vi.fn() },
		});
		runtime.mount();
		runtime.container.setValue('a', 1);
		await vi.waitFor(() => expect(seen).toEqual(['one:form_change']));
		await runtime.next();
		runtime.container.setValue('a', 2);
		await vi.waitFor(() => expect(seen).toEqual(['one:form_change', 'two:form_change']));
	});
});
