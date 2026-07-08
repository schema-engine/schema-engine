import { describe, test, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
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

	test('dispatchSync never throws to the caller on success', () => {
		registry.register({
			$type: 'log',
			schema: z.object({ id: z.string(), $type: z.literal('log'), name: z.string() }),
			metadata: { name: 'Log', defaultTriggers: ['submit'] },
			execute: async () => ({ success: true }),
		});

		expect(() =>
			dispatcher.dispatchSync({
				actions: [{ id: 'a1', $type: 'log', name: 'test' }],
				trigger: 'submit',
				context: { id: 'ctx-1' },
			}),
		).not.toThrow();
	});

	test('dispatchSync never throws when action returns a failure result', () => {
		registry.register({
			$type: 'log',
			schema: z.object({ id: z.string(), $type: z.literal('log'), name: z.string() }),
			metadata: { name: 'Log', defaultTriggers: ['submit'] },
			execute: async () => ({ success: false, error: 'handler failed' }),
		});

		expect(() =>
			dispatcher.dispatchSync({
				actions: [{ id: 'a1', $type: 'log', name: 'test' }],
				trigger: 'submit',
				context: { id: 'ctx-1' },
			}),
		).not.toThrow();
	});
});
