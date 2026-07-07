import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Async Actions', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
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
					await new Promise((resolve) => setTimeout(resolve, 10));
					executionLog.push(context.config.name);
					return { success: true };
				},
			});

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const start = Date.now();
			await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'delay-action', name: 'first' },
					{ id: 'action-2', $type: 'delay-action', name: 'second' },
				],
				trigger: 'submit',
				context: createContext(),
			});
			const duration = Date.now() - start;

			expect(duration).toBeGreaterThanOrEqual(20);
			expect(executionLog).toEqual(['first', 'second']);
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'sequential-action', name: 'first' },
					{ id: 'action-2', $type: 'sequential-action', name: 'second' },
					{ id: 'action-3', $type: 'sequential-action', name: 'third' },
				],
				trigger: 'submit',
				context: createContext(),
			});

			expect(order).toEqual([0, 1, 2]);
			expect(executionLog).toEqual(['first', 'second', 'third']);
		});
	});
});
