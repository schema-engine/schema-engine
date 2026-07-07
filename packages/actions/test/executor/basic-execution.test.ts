import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import {
	MockActionRegistry,
	createContext,
	type TestActionConfig,
	type TestContext,
	type TestTrigger,
} from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Basic Action Execution', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const actions: TestActionConfig[] = [{ id: 'action-1', $type: 'test-action', name: 'First Action' }];

			const results = await executor.execute({ actions, trigger: 'submit', context: createContext() });

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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const actions: TestActionConfig[] = [
				{ id: 'action-1', $type: 'log-action', name: 'first' },
				{ id: 'action-2', $type: 'log-action', name: 'second' },
				{ id: 'action-3', $type: 'log-action', name: 'third' },
			];

			await executor.execute({ actions, trigger: 'submit', context: createContext() });

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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const actions: TestActionConfig[] = [
				{ id: 'action-3', $type: 'action-c', name: 'third' },
				{ id: 'action-1', $type: 'action-a', name: 'first' },
				{ id: 'action-2', $type: 'action-b', name: 'second' },
			];

			await executor.execute({ actions, trigger: 'submit', context: createContext() });

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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const testContext: TestContext = {
				id: 'ctx-123',
				data: { foo: 'bar' },
				timestamp: 1234567890,
			};

			await executor.execute({
				actions: [{ id: 'action-1', $type: 'context-test', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const testConfig: TestActionConfig = {
				id: 'action-1',
				$type: 'config-test',
				name: 'test-config',
				value: { nested: 'data' },
			};

			await executor.execute({ actions: [testConfig], trigger: 'submit', context: createContext() });

			expect(receivedConfig).toEqual(testConfig);
		});
	});
});
