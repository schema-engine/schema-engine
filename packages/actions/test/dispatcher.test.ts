import { describe, test, expect, beforeEach } from 'vitest';
import * as z from 'zod/mini';
import { ActionDispatcher } from '../src/dispatcher';
import type { ActionRegistryProvider } from '../src/registry';
import type { ActionRegistration, ActionConfigBase } from '../src/types';

type TestTrigger = 'submit' | 'change';

interface TestContext {
	id: string;
	metadata?: Record<string, unknown>;
}

interface TestActionConfig extends ActionConfigBase<'log'> {
	name: string;
}

class MockRegistry implements ActionRegistryProvider<TestContext, TestTrigger> {
	private actions = new Map<string, ActionRegistration<TestActionConfig, TestContext, TestTrigger>>();

	register(action: ActionRegistration<TestActionConfig, TestContext, TestTrigger>) {
		this.actions.set(action.$type, action);
	}

	getAction(type: string) {
		return this.actions.get(type);
	}

	getActionTypes(): string[] {
		return Array.from(this.actions.keys());
	}
}

describe('ActionDispatcher', () => {
	let registry: MockRegistry;
	let dispatcher: ActionDispatcher<TestContext, TestTrigger>;

	beforeEach(() => {
		registry = new MockRegistry();
		dispatcher = new ActionDispatcher(registry);
	});

	test('returns empty array when no actions provided', async () => {
		const results = await dispatcher.dispatch({
			actions: [],
			trigger: 'submit',
			context: { id: 'ctx-1' },
		});
		expect(results).toEqual([]);
	});

	test('merges metadata into context with metadata property', async () => {
		let receivedMetadata: Record<string, unknown> | undefined;

		registry.register({
			$type: 'log',
			schema: z.object({ id: z.string(), $type: z.literal('log'), name: z.string() }),
			metadata: { name: 'Log', defaultTriggers: ['submit'] },
			execute: async (ctx) => {
				receivedMetadata = ctx.metadata;
				return { success: true };
			},
		});

		await dispatcher.dispatch({
			actions: [{ id: 'a1', $type: 'log', name: 'test' }],
			trigger: 'submit',
			context: { id: 'ctx-1', metadata: { existing: true } },
			metadata: { userId: '123' },
		});

		expect(receivedMetadata).toEqual({ existing: true, userId: '123' });
	});

	test('does not merge metadata when context lacks metadata shape', async () => {
		let receivedId: string | undefined;

		registry.register({
			$type: 'log',
			schema: z.object({ id: z.string(), $type: z.literal('log'), name: z.string() }),
			metadata: { name: 'Log', defaultTriggers: ['submit'] },
			execute: async (ctx) => {
				receivedId = ctx.id;
				return { success: true };
			},
		});

		await dispatcher.dispatch({
			actions: [{ id: 'a1', $type: 'log', name: 'test' }],
			trigger: 'submit',
			context: { id: 'ctx-plain' },
			metadata: { userId: '123' },
		});

		expect(receivedId).toBe('ctx-plain');
	});

	test('dispatchSync forwards to dispatch with merged context and resolves the executor', async () => {
		const executeCalls: Array<{ context: TestContext; config: TestActionConfig }> = [];

		registry.register({
			$type: 'log',
			schema: z.object({ id: z.string(), $type: z.literal('log'), name: z.string() }),
			metadata: { name: 'Log', defaultTriggers: ['submit'] },
			execute: async (ctx) => {
				executeCalls.push({ context: ctx, config: ctx.config });
				return { success: true };
			},
		});

		dispatcher.dispatchSync({
			actions: [{ id: 'a1', $type: 'log', name: 'test' }],
			trigger: 'submit',
			context: { id: 'ctx-1' },
			metadata: { userId: '123' },
		});

		await new Promise((resolve) => setImmediate(resolve));

		expect(executeCalls).toHaveLength(1);
		expect(executeCalls[0]!.config.id).toBe('a1');
		expect(executeCalls[0]!.context.id).toBe('ctx-1');
		expect(executeCalls[0]!.context.metadata).toEqual({ userId: '123' });
	});

	test('dispatchSync swallows executor failures and never raises to the caller', async () => {
		const executeCalls: Array<unknown> = [];
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', onUnhandled);

		registry.register({
			$type: 'log',
			schema: z.object({ id: z.string(), $type: z.literal('log'), name: z.string() }),
			metadata: { name: 'Log', defaultTriggers: ['submit'] },
			execute: async (ctx) => {
				executeCalls.push(ctx.config);
				return { success: false, error: 'handler failed' };
			},
		});

		expect(() =>
			dispatcher.dispatchSync({
				actions: [{ id: 'a1', $type: 'log', name: 'test' }],
				trigger: 'submit',
				context: { id: 'ctx-1' },
			}),
		).not.toThrow();

		await new Promise((resolve) => setImmediate(resolve));

		(process as NodeJS.EventEmitter).off('unhandledRejection', onUnhandled);
		expect(executeCalls).toHaveLength(1);
		expect(unhandled).toEqual([]);
	});
});
