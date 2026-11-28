import { describe, test, expect, beforeEach } from 'vitest';
import { parsed } from './parsed';
import { ActionDispatcher } from '../src/dispatcher';
import { createMutableRegistry } from '@schema-engine/registry';
import type { ActionRegistration, ActionConfigBase } from '../src/types';
import * as z from 'zod/mini';

type TestTrigger = 'mount' | 'change' | 'submit' | 'complete' | 'error';

interface TestContext {
	id: string;
	data: Record<string, unknown>;
	timestamp: number;
}

interface TestActionConfig extends ActionConfigBase {
	name: string;
	value?: unknown;
}

function createContext(overrides: Partial<TestContext> = {}): TestContext {
	return {
		id: 'test-1',
		data: {},
		timestamp: Date.now(),
		...overrides,
	};
}

const createTestRegistry = () =>
	createMutableRegistry<ActionRegistration<TestActionConfig, TestContext, TestTrigger>>('Action');

describe('ActionDispatcher', () => {
	let registry: ReturnType<typeof createTestRegistry>;
	let executionLog: string[];

	beforeEach(() => {
		registry = createTestRegistry();
		executionLog = [];
	});

	describe('Basic Action Execution', () => {
		test('should execute a simple action successfully', async () => {
			registry.register({
				$type: 'test-action',
				schema: z.any(),
				metadata: {
					name: 'Test Action',
					description: 'A test action',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					executionLog.push(`executed:${context.config.name}`);
					return { success: true, message: 'Action completed' };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const actions: TestActionConfig[] = [{ id: 'action-1', $type: 'test-action', name: 'First Action' }];

			const results = await executor.dispatch({
				actions: parsed(actions),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(results[0].message).toBe('Action completed');
			expect(executionLog).toEqual(['executed:First Action']);
		});

		test('should execute multiple actions sequentially', async () => {
			registry.register({
				$type: 'log-action',
				schema: z.any(),
				metadata: {
					name: 'Log Action',
					description: 'Logs execution',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					executionLog.push(context.config.name);
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const actions: TestActionConfig[] = [
				{ id: 'action-1', $type: 'log-action', name: 'first' },
				{ id: 'action-2', $type: 'log-action', name: 'second' },
				{ id: 'action-3', $type: 'log-action', name: 'third' },
			];

			await executor.dispatch({ actions: parsed(actions), trigger: 'submit', context: createContext() });

			expect(executionLog).toEqual(['first', 'second', 'third']);
		});

		test('should execute actions in array order, not registration order', async () => {
			registry.register({
				$type: 'action-a',
				schema: z.any(),
				metadata: {
					name: 'Action A',
					description: 'First registered',
					defaultTriggers: ['submit'],
				},
				execute: async (_context) => {
					executionLog.push('a');
					return { success: true };
				},
			});

			registry.register({
				$type: 'action-b',
				schema: z.any(),
				metadata: {
					name: 'Action B',
					description: 'Second registered',
					defaultTriggers: ['submit'],
				},
				execute: async (_context) => {
					executionLog.push('b');
					return { success: true };
				},
			});

			registry.register({
				$type: 'action-c',
				schema: z.any(),
				metadata: {
					name: 'Action C',
					description: 'Third registered',
					defaultTriggers: ['submit'],
				},
				execute: async (_context) => {
					executionLog.push('c');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const actions: TestActionConfig[] = [
				{ id: 'action-3', $type: 'action-c', name: 'third' },
				{ id: 'action-1', $type: 'action-a', name: 'first' },
				{ id: 'action-2', $type: 'action-b', name: 'second' },
			];

			await executor.dispatch({ actions: parsed(actions), trigger: 'submit', context: createContext() });

			expect(executionLog).toEqual(['c', 'a', 'b']);
		});

		test('should pass context to action handler', async () => {
			let receivedContext:
				| (TestContext & {
						config: TestActionConfig;
						trigger: TestTrigger;
				  })
				| undefined;

			registry.register({
				$type: 'context-test',
				schema: z.any(),
				metadata: {
					name: 'Context Test',
					description: 'Tests context passing',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					receivedContext = context;
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const testContext: TestContext = {
				id: 'ctx-123',
				data: { foo: 'bar' },
				timestamp: 1234567890,
			};

			await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'context-test', name: 'test' }]),
				trigger: 'submit',
				context: testContext,
			});

			expect(receivedContext).toBeDefined();
			expect(receivedContext!.id).toBe('ctx-123');
			expect(receivedContext!.data).toEqual({ foo: 'bar' });
			expect(receivedContext!.config).toBeDefined();
			expect(receivedContext!.config.id).toBe('action-1');
			expect(receivedContext!.trigger).toBe('submit');
		});

		test('should pass config to action handler', async () => {
			let receivedConfig: TestActionConfig | undefined;

			registry.register({
				$type: 'config-test',
				schema: z.any(),
				metadata: {
					name: 'Config Test',
					description: 'Tests config passing',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					receivedConfig = context.config;
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const testConfig: TestActionConfig = {
				id: 'action-1',
				$type: 'config-test',
				name: 'test-config',
				value: { nested: 'data' },
			};

			await executor.dispatch({ actions: parsed([testConfig]), trigger: 'submit', context: createContext() });

			expect(receivedConfig).toEqual(testConfig);
		});
	});

	describe('Trigger Matching', () => {
		test('should execute action with matching default trigger', async () => {
			registry.register({
				$type: 'mount-action',
				schema: z.any(),
				metadata: {
					name: 'Mount Action',
					description: 'Runs on mount',
					defaultTriggers: ['mount'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'mount-action', name: 'test' }]),
				trigger: 'mount',
				context: createContext(),
			});

			expect(executionLog).toEqual(['executed']);
		});

		test('should skip action with non-matching trigger', async () => {
			registry.register({
				$type: 'mount-action',
				schema: z.any(),
				metadata: {
					name: 'Mount Action',
					description: 'Runs on mount',
					defaultTriggers: ['mount'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'mount-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual([]);
		});

		test('should respect custom triggers on action config', async () => {
			registry.register({
				$type: 'flexible-action',
				schema: z.any(),
				metadata: {
					name: 'Flexible Action',
					description: 'Has default triggers',
					defaultTriggers: ['mount'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);

			await executor.dispatch({
				actions: parsed([
					{
						id: 'action-1',
						$type: 'flexible-action',
						name: 'test',
						triggers: ['submit', 'change'],
					},
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['executed']);
			executionLog = [];

			await executor.dispatch({
				actions: parsed([
					{
						id: 'action-1',
						$type: 'flexible-action',
						name: 'test',
						triggers: ['submit', 'change'],
					},
				]),
				trigger: 'mount',
				context: createContext(),
			});

			expect(executionLog).toEqual([]);
		});

		test('should execute action with multiple default triggers', async () => {
			registry.register({
				$type: 'multi-trigger',
				schema: z.any(),
				metadata: {
					name: 'Multi Trigger',
					description: 'Responds to multiple triggers',
					defaultTriggers: ['mount', 'submit', 'change'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const action = { id: 'action-1', $type: 'multi-trigger', name: 'test' };
			const context = createContext();

			await executor.dispatch({ actions: parsed([action]), trigger: 'mount', context });
			await executor.dispatch({ actions: parsed([action]), trigger: 'submit', context });
			await executor.dispatch({ actions: parsed([action]), trigger: 'change', context });

			expect(executionLog).toEqual(['executed', 'executed', 'executed']);
		});
	});

	describe('Enabled/Disabled Actions', () => {
		test('should skip disabled actions', async () => {
			registry.register({
				$type: 'test-action',
				schema: z.any(),
				metadata: {
					name: 'Test Action',
					description: 'Test',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'test-action', name: 'test', enabled: false }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual([]);
		});

		test('should execute enabled actions by default', async () => {
			registry.register({
				$type: 'test-action',
				schema: z.any(),
				metadata: {
					name: 'Test Action',
					description: 'Test',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'test-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['executed']);
		});

		test('should execute explicitly enabled actions', async () => {
			registry.register({
				$type: 'test-action',
				schema: z.any(),
				metadata: {
					name: 'Test Action',
					description: 'Test',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'test-action', name: 'test', enabled: true }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['executed']);
		});
	});

	describe('Error Handling', () => {
		test('should handle action that returns failure', async () => {
			registry.register({
				$type: 'failing-action',
				schema: z.any(),
				metadata: {
					name: 'Failing Action',
					description: 'Always fails',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					executionLog.push('failed');
					return { success: false, error: 'Something went wrong' };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'failing-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('Something went wrong');
			expect(executionLog).toEqual(['failed']);
		});

		test('should handle action that throws error', async () => {
			registry.register({
				$type: 'throwing-action',
				schema: z.any(),
				metadata: {
					name: 'Throwing Action',
					description: 'Throws error',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					throw new Error('Unexpected error');
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'throwing-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('Unexpected error');
		});

		test('should handle non-Error thrown values', async () => {
			registry.register({
				$type: 'throwing-string',
				schema: z.any(),
				metadata: {
					name: 'Throwing String',
					description: 'Throws string',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					throw 'string error';
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'throwing-string', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('string error');
		});

		test('should continue executing after failed action by default', async () => {
			registry.register({
				$type: 'mixed-action',
				schema: z.any(),
				metadata: {
					name: 'Mixed Action',
					description: 'Can succeed or fail',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					executionLog.push(context.config.name);
					return context.config.name === 'fail' ? { success: false, error: 'Failed' } : { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'mixed-action', name: 'success1' },
					{ id: 'action-2', $type: 'mixed-action', name: 'fail' },
					{ id: 'action-3', $type: 'mixed-action', name: 'success2' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(3);
			expect(executionLog).toEqual(['success1', 'fail', 'success2']);
		});

		test('should stop executing when shouldContinue is false', async () => {
			registry.register({
				$type: 'stop-action',
				schema: z.any(),
				metadata: {
					name: 'Stop Action',
					description: 'Stops execution',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					executionLog.push(context.config.name);
					return context.config.name === 'stop'
						? { success: false, error: 'Stop here', shouldContinue: false }
						: { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'stop-action', name: 'first' },
					{ id: 'action-2', $type: 'stop-action', name: 'stop' },
					{ id: 'action-3', $type: 'stop-action', name: 'never-reached' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(2);
			expect(executionLog).toEqual(['first', 'stop']);
		});

		test('should handle unregistered action type', async () => {
			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'non-existent', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('No handler registered');
		});
	});

	describe('Action Results', () => {
		test('should return result with message', async () => {
			registry.register({
				$type: 'message-action',
				schema: z.any(),
				metadata: {
					name: 'Message Action',
					description: 'Returns message',
					defaultTriggers: ['submit'],
				},
				execute: async () => ({
					success: true,
					message: 'Action completed successfully',
				}),
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'message-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results[0].message).toBe('Action completed successfully');
		});

		test('should return result with data', async () => {
			registry.register({
				$type: 'data-action',
				schema: z.any(),
				metadata: {
					name: 'Data Action',
					description: 'Returns data',
					defaultTriggers: ['submit'],
				},
				execute: async () => ({
					success: true,
					data: { userId: '123', status: 'created' },
				}),
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'data-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results[0].data).toEqual({ userId: '123', status: 'created' });
		});

		test('should collect all results from multiple actions', async () => {
			registry.register({
				$type: 'result-action',
				schema: z.any(),
				metadata: {
					name: 'Result Action',
					description: 'Returns result',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => ({
					success: true,
					data: { actionName: context.config.name },
				}),
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'result-action', name: 'first' },
					{ id: 'action-2', $type: 'result-action', name: 'second' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(2);
			expect(results[0].data).toEqual({ actionName: 'first' });
			expect(results[1].data).toEqual({ actionName: 'second' });
		});
	});

	describe('Empty and Edge Cases', () => {
		test('should handle empty actions array', async () => {
			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toEqual([]);
		});

		test('should handle actions with no matching triggers', async () => {
			registry.register({
				$type: 'mount-only',
				schema: z.any(),
				metadata: {
					name: 'Mount Only',
					description: 'Only on mount',
					defaultTriggers: ['mount'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'mount-only', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toEqual([]);
			expect(executionLog).toEqual([]);
		});

		test('should handle action with no default triggers', async () => {
			registry.register({
				$type: 'no-triggers',
				schema: z.any(),
				metadata: {
					name: 'No Triggers',
					description: 'Has no default triggers',
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'no-triggers', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toEqual([]);
		});

		test('should handle action with empty custom triggers array', async () => {
			registry.register({
				$type: 'empty-triggers',
				schema: z.any(),
				metadata: {
					name: 'Empty Triggers',
					description: 'Has default triggers',
					defaultTriggers: ['submit'],
				},
				execute: async () => {
					executionLog.push('executed');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'empty-triggers', name: 'test', triggers: [] }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toEqual([]);
		});
	});

	describe('Async Actions', () => {
		test('should handle async actions with delays', async () => {
			registry.register({
				$type: 'delay-action',
				schema: z.any(),
				metadata: {
					name: 'Delay Action',
					description: 'Delays execution',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					executionLog.push(`start ${context.config.name}`);
					await new Promise((resolve) => setTimeout(resolve, 10));
					executionLog.push(`end ${context.config.name}`);
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'delay-action', name: 'first' },
					{ id: 'action-2', $type: 'delay-action', name: 'second' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['start first', 'end first', 'start second', 'end second']);
		});

		test('should execute actions sequentially, not in parallel', async () => {
			const order: number[] = [];

			registry.register({
				$type: 'sequential-action',
				schema: z.any(),
				metadata: {
					name: 'Sequential Action',
					description: 'Tests sequential execution',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					const startOrder = order.length;
					await new Promise((resolve) => setTimeout(resolve, 10));
					order.push(startOrder);
					executionLog.push(context.config.name);
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'sequential-action', name: 'first' },
					{ id: 'action-2', $type: 'sequential-action', name: 'second' },
					{ id: 'action-3', $type: 'sequential-action', name: 'third' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(order).toEqual([0, 1, 2]);
			expect(executionLog).toEqual(['first', 'second', 'third']);
		});
	});

	describe('Synchronous Actions', () => {
		test('should handle synchronous handler returning result directly', async () => {
			registry.register({
				$type: 'sync-action',
				schema: z.any(),
				metadata: {
					name: 'Sync Action',
					description: 'Synchronous handler',
					defaultTriggers: ['submit'],
				},
				execute: (context) => {
					executionLog.push(context.config.name);
					return { success: true, message: 'Sync result' };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			const results = await executor.dispatch({
				actions: parsed([{ id: 'action-1', $type: 'sync-action', name: 'test' }]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(results[0].success).toBe(true);
			expect(results[0].message).toBe('Sync result');
			expect(executionLog).toEqual(['test']);
		});
	});

	describe('Complex Scenarios', () => {
		test('should handle mix of enabled, disabled, and trigger-matched actions', async () => {
			registry.register({
				$type: 'complex-action',
				schema: z.any(),
				metadata: {
					name: 'Complex Action',
					description: 'For complex tests',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					executionLog.push(context.config.name);
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'complex-action', name: 'enabled-match' },
					{ id: 'action-2', $type: 'complex-action', name: 'disabled', enabled: false },
					{ id: 'action-3', $type: 'complex-action', name: 'wrong-trigger', triggers: ['mount'] },
					{ id: 'action-4', $type: 'complex-action', name: 'custom-match', triggers: ['submit'] },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['enabled-match', 'custom-match']);
		});

		test('should handle different action types in same execution', async () => {
			registry.register({
				$type: 'type-a',
				schema: z.any(),
				metadata: {
					name: 'Type A',
					description: 'First type',
					defaultTriggers: ['submit'],
				},
				execute: async (_context) => {
					executionLog.push('type-a');
					return { success: true };
				},
			});

			registry.register({
				$type: 'type-b',
				schema: z.any(),
				metadata: {
					name: 'Type B',
					description: 'Second type',
					defaultTriggers: ['submit'],
				},
				execute: async (_context) => {
					executionLog.push('type-b');
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'type-a', name: 'a1' },
					{ id: 'action-2', $type: 'type-b', name: 'b1' },
					{ id: 'action-3', $type: 'type-a', name: 'a2' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['type-a', 'type-b', 'type-a']);
		});

		test('should handle action modifying context for next action', async () => {
			const sharedState: Record<string, unknown> = {};

			registry.register({
				$type: 'stateful-action',
				schema: z.any(),
				metadata: {
					name: 'Stateful Action',
					description: 'Can read/write shared state',
					defaultTriggers: ['submit'],
				},
				execute: async (context) => {
					if (context.config.value) {
						sharedState[context.config.name] = context.config.value;
					}
					executionLog.push(`${context.config.name}=${JSON.stringify(sharedState)}`);
					return { success: true };
				},
			});

			const executor = new ActionDispatcher<TestContext, TestTrigger>(registry);
			await executor.dispatch({
				actions: parsed([
					{ id: 'action-1', $type: 'stateful-action', name: 'first', value: 'one' },
					{ id: 'action-2', $type: 'stateful-action', name: 'second', value: 'two' },
					{ id: 'action-3', $type: 'stateful-action', name: 'read' },
				]),
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual([
				'first={"first":"one"}',
				'second={"first":"one","second":"two"}',
				'read={"first":"one","second":"two"}',
			]);
		});
	});

	test('passes triggeredBy to action handler context', async () => {
		const triggerAction: TestActionConfig = { id: 'parent', $type: 'test-action', name: 'parent' };
		let receivedTriggeredBy: TestActionConfig | undefined;

		registry.register({
			$type: 'test-action',
			schema: z.any(),
			metadata: { name: 'Test', defaultTriggers: ['submit'] },
			execute: async (ctx) => {
				receivedTriggeredBy = ctx.triggeredBy;
				return { success: true };
			},
		});

		const executor = new ActionDispatcher(registry);
		await executor.dispatch({
			actions: parsed([{ id: 'child', $type: 'test-action', name: 'child' }]),
			trigger: 'submit',
			context: createContext(),
			triggeredBy: triggerAction,
		});

		expect(receivedTriggeredBy).toEqual(triggerAction);
	});
});
