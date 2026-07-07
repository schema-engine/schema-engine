import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Synchronous Actions', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'sync-action', name: 'test' }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results[0].success).toBe(true);
			expect(results[0].message).toBe('Sync result');
			expect(executionLog).toEqual(['test']);
		});
	});
});
