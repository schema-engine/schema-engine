import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { ActionDispatcher } from '../src/dispatcher';
import { ActionRegistry } from '../src/registry';
import type { ActionConfigBase, ActionRegistration } from '../src/types';

type Config = ActionConfigBase & { behavior: 'wait' | 'fail' | 'optional' | 'later' };

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function setup(
	run: (
		config: Config,
		signal: AbortSignal,
	) => Promise<{ success: boolean; error?: string; data?: unknown; shouldContinue?: boolean }>,
) {
	const work: ActionRegistration = {
		$type: 'work',
		schema: z.any(),
		metadata: { name: 'work', description: 'work', defaultTriggers: ['submit'] },
		execute: ({ config, signal }) => run(config as Config, signal),
	};
	const registry = new ActionRegistry([work]);
	return new ActionDispatcher(registry);
}

const action = (id: string, behavior: Config['behavior']): Config => ({ id, $type: 'work', behavior });

describe('parallel action groups', () => {
	test('starts eligible actions together and returns identified results in configuration order', async () => {
		const releaseA = deferred<void>();
		const releaseB = deferred<void>();
		const starts: string[] = [];
		const dispatcher = setup(async (config) => {
			starts.push(config.id);
			await (config.id === 'a' ? releaseA.promise : releaseB.promise);
			return { success: true, data: config.id };
		});
		const running = dispatcher.dispatch({
			actions: [[action('a', 'wait'), action('b', 'wait')]],
			trigger: 'submit',
			context: {},
		});
		await Promise.resolve();
		expect(starts).toEqual(['a', 'b']);
		releaseB.resolve();
		await Promise.resolve();
		releaseA.resolve();
		expect(await running).toMatchObject([
			{ actionId: 'a', data: 'a', groupIndex: 0 },
			{ actionId: 'b', data: 'b', groupIndex: 1 },
		]);
	});

	test('requests cancellation on blocking failure, waits for the sibling, and skips later actions', async () => {
		const release = deferred<void>();
		const started = deferred<void>();
		let signal: AbortSignal | undefined;
		const dispatcher = setup(async (config, currentSignal) => {
			if (config.behavior === 'wait') {
				signal = currentSignal;
				started.resolve();
				await release.promise;
				return { success: true, data: 'completed' };
			}
			if (config.behavior === 'fail') {
				await started.promise;
				return { success: false, error: 'failed', shouldContinue: false };
			}
			throw new Error('later action must not run');
		});
		const running = dispatcher.dispatch({
			actions: [[action('a', 'wait'), action('b', 'fail')], action('later', 'later')],
			trigger: 'submit',
			context: {},
		});
		await started.promise;
		await new Promise((done) => setTimeout(done, 0));
		expect(signal?.aborted).toBe(true);
		release.resolve();
		expect(await running).toMatchObject([
			{ actionId: 'a', success: true, status: 'succeeded', data: 'completed', cancellationRequested: true },
			{ actionId: 'b', success: false, error: 'failed' },
		]);
	});

	test('continues after nonblocking failure and returns its error', async () => {
		const dispatcher = setup(async (config) =>
			config.behavior === 'optional'
				? { success: false, error: 'optional', shouldContinue: true }
				: { success: true },
		);
		const result = await dispatcher.dispatch({
			actions: [[action('a', 'optional'), action('b', 'wait')], action('later', 'later')],
			trigger: 'submit',
			context: {},
		});
		expect(result).toMatchObject([
			{ actionId: 'a', success: false, error: 'optional' },
			{ actionId: 'b', success: true },
			{ actionId: 'later', success: true },
		]);
	});

	test('reports a cooperative abort and retains the blocking failure', async () => {
		const started = deferred<void>();
		const dispatcher = setup(async (config, signal) => {
			if (config.behavior === 'fail') {
				await started.promise;
				return { success: false, error: 'original', shouldContinue: false };
			}
			return new Promise((resolve, reject) => {
				signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), {
					once: true,
				});
				started.resolve();
			});
		});
		const results = await dispatcher.dispatch({
			actions: [[action('wait', 'wait'), action('fail', 'fail')]],
			trigger: 'submit',
			context: {},
		});
		expect(results).toMatchObject([
			{ actionId: 'wait', status: 'cancelled', cancellationRequested: true },
			{ actionId: 'fail', status: 'failed', error: 'original', shouldContinue: false },
		]);
	});

	test('filters disabled and mismatched actions within groups', async () => {
		const ran: string[] = [];
		const dispatcher = setup(async (config) => {
			ran.push(config.id);
			return { success: true };
		});
		const results = await dispatcher.dispatch({
			actions: [
				[
					{ ...action('disabled', 'wait'), enabled: false },
					{ ...action('wrong', 'wait'), triggers: ['change'] },
					action('run', 'wait'),
				],
			],
			trigger: 'submit',
			context: {},
		});
		expect(ran).toEqual(['run']);
		expect(results).toMatchObject([{ actionId: 'run', groupIndex: 2 }]);
	});
});

test('preserves a thrown error for the caller', async () => {
	const failure = new Error('Network failed', { cause: { requestId: 'req-123' } });
	const dispatcher = setup(async () => {
		throw failure;
	});
	const results = await dispatcher.dispatch({ actions: [action('save', 'fail')], trigger: 'submit', context: {} });
	expect(results[0]).toMatchObject({ actionId: 'save', success: false, error: 'Network failed', cause: failure });
	expect(results[0].cause).toBe(failure);
});

describe('an outer signal', () => {
	test('is chained into the signal each action receives, and stops the sequence once aborted', async () => {
		const outer = new AbortController();
		const release = deferred<void>();
		const started: string[] = [];
		const seen: AbortSignal[] = [];
		const dispatcher = setup(async (config, signal) => {
			started.push(config.id);
			seen.push(signal);
			await release.promise;
			return { success: true };
		});
		const running = dispatcher.dispatch({
			actions: [action('a', 'wait'), action('b', 'wait')],
			trigger: 'submit',
			context: {},
			signal: outer.signal,
		});
		await Promise.resolve();
		outer.abort();
		release.resolve();
		const results = await running;
		expect(seen[0]?.aborted).toBe(true);
		expect(started).toEqual(['a']);
		expect(results.map(({ actionId }) => actionId)).toEqual(['a']);
	});

	test('runs nothing when it is aborted before the dispatch', async () => {
		const outer = new AbortController();
		outer.abort();
		const started: string[] = [];
		const dispatcher = setup(async (config) => {
			started.push(config.id);
			return { success: true };
		});
		expect(
			await dispatcher.dispatch({
				actions: [action('a', 'wait')],
				trigger: 'submit',
				context: {},
				signal: outer.signal,
			}),
		).toEqual([]);
		expect(started).toEqual([]);
	});
});
