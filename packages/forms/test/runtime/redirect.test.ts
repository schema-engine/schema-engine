import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { createFormRuntime } from '@/runtime';
import { defineInput } from '@/types';
import { anyValue } from '../lib/any-value';

type Answer = { success: boolean; redirectUrl?: string; shouldContinue?: boolean };

/** A one-field form whose `go` action answers as the test says, and a `submit` trigger that runs it. */
function setup(answers: Answer[], options: { onSubmit?: () => void; navigate?: (url: string) => void } = {}) {
	const queue = [...answers];
	const engine = createFormEngine({
		elements: [
			defineInput({
				value: anyValue,
				$type: 'input',
				schema: z.looseObject({ name: z.string() }),
				metadata: { name: 'Input', category: 'input' },
				render: (_props: Record<string, unknown>) => null,
			}),
		],
		actions: [
			{
				$type: 'go',
				schema: z.object({}),
				metadata: { name: 'Go', defaultTriggers: ['form_submit'] },
				execute: async () => queue.shift() ?? { success: true },
			},
		],
	});
	const host = { focus: vi.fn(), submitNatively: vi.fn() };
	const runtime = createFormRuntime({
		engine,
		config: engine.validateForm({
			id: 'redirect',
			steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'input', name: 'email' }] }],
			actions: answers.map((_, index) => ({ id: `go-${index}`, $type: 'go' })),
		}),
		host,
		...options,
	});
	runtime.mount();
	return { runtime, host };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the redirectUrl of a successful submission', () => {
	test('navigates once, with the url, after every action and onSubmit succeeded', async () => {
		const order: string[] = [];
		const navigate = vi.fn((url: string) => order.push(`navigate ${url}`));
		const { runtime, host } = setup([{ success: true, redirectUrl: '/thanks' }, { success: true }], {
			onSubmit: () => order.push('onSubmit'),
			navigate,
		});

		expect(await runtime.submit()).toBe('submitted');

		expect(order).toEqual(['onSubmit', 'navigate /thanks']);
		expect(navigate).toHaveBeenCalledOnce();
		expect(host.submitNatively).not.toHaveBeenCalled();
	});

	test('the last successful action that set one wins', async () => {
		const navigate = vi.fn();
		const { runtime } = setup(
			[
				{ success: true, redirectUrl: '/first' },
				{ success: true, redirectUrl: '/last' },
			],
			{
				navigate,
			},
		);

		await runtime.submit();

		expect(navigate).toHaveBeenCalledExactlyOnceWith('/last');
	});

	test('does not navigate when a later action failed the submission', async () => {
		const navigate = vi.fn();
		const { runtime } = setup(
			[
				{ success: true, redirectUrl: '/thanks' },
				{ success: false, shouldContinue: false },
			],
			{ navigate },
		);

		expect(await runtime.submit()).toBe('failed');

		expect(navigate).not.toHaveBeenCalled();
	});

	test('does not navigate when onSubmit rejected', async () => {
		const navigate = vi.fn();
		const { runtime } = setup([{ success: true, redirectUrl: '/thanks' }], {
			onSubmit: () => {
				throw new Error('rejected');
			},
			navigate,
		});

		expect(await runtime.submit()).toBe('failed');

		expect(navigate).not.toHaveBeenCalled();
	});

	test('does not navigate when no action asked for it, and lets the host post natively', async () => {
		const navigate = vi.fn();
		const { runtime, host } = setup([{ success: true }], { navigate });

		await runtime.submit();

		expect(navigate).not.toHaveBeenCalled();
		expect(host.submitNatively).toHaveBeenCalledOnce();
	});

	test('assigns the location by default where there is one', async () => {
		const assign = vi.fn();
		vi.stubGlobal('location', { assign });
		const { runtime } = setup([{ success: true, redirectUrl: '/thanks' }]);

		await runtime.submit();

		expect(assign).toHaveBeenCalledExactlyOnceWith('/thanks');
	});

	test('does nothing by default where there is no location', async () => {
		vi.stubGlobal('location', undefined);
		const { runtime } = setup([{ success: true, redirectUrl: '/thanks' }]);

		expect(await runtime.submit()).toBe('submitted');
	});
});
