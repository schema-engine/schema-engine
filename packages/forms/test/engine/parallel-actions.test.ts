import { expect, test } from 'vitest';
import { ActionDispatcher } from '@schema-engine/actions';
import { createFormEngine } from '@/index';
import { runSubmissionLifecycle } from '@/runtime/submission-lifecycle';
import { formSubmitPlugin } from '@/actions';
import type { BuilderActionBaseContext } from '@/types';

test('validates and dispatches parallel submit actions through the form lifecycle', async () => {
	const requests: string[] = [];
	let finish!: () => void;
	const bothStarted = new Promise<void>((resolve) => {
		finish = resolve;
	});
	const submit = formSubmitPlugin({
		request: async (url) => {
			requests.push(url);
			if (requests.length === 2) finish();
			await bothStarted;
			return new Response(JSON.stringify({ id: url }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		},
	});
	const engine = createFormEngine({ actions: [submit] });
	const form = engine.validateForm({
		id: 'group',
		steps: [{ id: 'step', title: 'Step', elements: [] }],
		actions: [
			[
				{ id: 'a', $type: 'submit', endpoint: '/a' },
				{ id: 'b', $type: 'submit', endpoint: '/b' },
			],
		],
	});
	const dispatcher = new ActionDispatcher(engine);
	const context = { formData: {}, metadata: {}, formId: 'group' } as BuilderActionBaseContext;
	const result = await runSubmissionLifecycle((input) => dispatcher.dispatch(input), {
		actions: form.actions ?? [],
		context,
	});
	expect(requests).toEqual(['/a', '/b']);
	expect(result).toMatchObject({
		succeeded: true,
		results: [
			{ actionId: 'a', data: { id: '/a' } },
			{ actionId: 'b', data: { id: '/b' } },
		],
	});
});

test('rejects an unregistered action inside a parallel group', () => {
	const engine = createFormEngine({ actions: [formSubmitPlugin()] });
	expect(() =>
		engine.validateForm({
			id: 'group',
			steps: [{ id: 'step', title: 'Step', elements: [] }],
			actions: [[{ id: 'bad', $type: 'unknown' }]],
		}),
	).toThrow(/unknown/i);
});

test('keeps grouped callbacks matched to configurations with duplicate action IDs', async () => {
	const received: string[] = [];
	const submit = formSubmitPlugin({
		request: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
	});
	const engine = createFormEngine({ actions: [submit] });
	const form = engine.validateForm({
		id: 'duplicates',
		steps: [{ id: 'step', title: 'Step', elements: [] }],
		actions: [
			[
				{ id: 'same', $type: 'submit', endpoint: '/first' },
				{ id: 'same', $type: 'submit', endpoint: '/second' },
			],
		],
	});
	const dispatcher = new ActionDispatcher(engine);
	const context = { formData: {}, metadata: {}, formId: 'duplicates' } as BuilderActionBaseContext;
	const result = await runSubmissionLifecycle((input) => dispatcher.dispatch(input), {
		actions: form.actions ?? [],
		context,
		onAction: (action) => {
			received.push(String(action.endpoint));
		},
	});
	expect(received).toEqual(['/first', '/second']);
	expect(result.results).toMatchObject([
		{ actionId: 'same', groupIndex: 0 },
		{ actionId: 'same', groupIndex: 1 },
	]);
});

test('forwards cancellation to grouped submit requests and reports both outcomes', async () => {
	let started!: () => void;
	const waiting = new Promise<void>((resolve) => {
		started = resolve;
	});
	const submit = formSubmitPlugin({
		request: async (url, options) => {
			if (url === '/fail') {
				await waiting;
				return new Response('Rejected', { status: 400 });
			}
			return new Promise<Response>((_resolve, reject) => {
				options.signal?.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), {
					once: true,
				});
				started();
			});
		},
	});
	const engine = createFormEngine({ actions: [submit] });
	const form = engine.validateForm({
		id: 'cancel',
		steps: [{ id: 'step', title: 'Step', elements: [] }],
		actions: [
			[
				{ id: 'wait', $type: 'submit', endpoint: '/wait' },
				{ id: 'fail', $type: 'submit', endpoint: '/fail' },
			],
		],
	});
	const dispatcher = new ActionDispatcher(engine);
	const context = { formData: {}, metadata: {}, formId: 'cancel' } as BuilderActionBaseContext;
	const result = await runSubmissionLifecycle((input) => dispatcher.dispatch(input), {
		actions: form.actions ?? [],
		context,
	});
	expect(result).toMatchObject({
		succeeded: false,
		results: [
			{ actionId: 'wait', status: 'cancelled', cancellationRequested: true },
			{ actionId: 'fail', status: 'failed', error: expect.stringContaining('400') },
		],
	});
});
