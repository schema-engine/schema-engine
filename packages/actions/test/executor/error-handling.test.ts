import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Error Handling', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'failing-action', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'throwing-action', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'throwing-string', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'mixed-action', name: 'success1' },
					{ id: 'action-2', $type: 'mixed-action', name: 'fail' },
					{ id: 'action-3', $type: 'mixed-action', name: 'success2' },
				],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'stop-action', name: 'first' },
					{ id: 'action-2', $type: 'stop-action', name: 'stop' },
					{ id: 'action-3', $type: 'stop-action', name: 'never-reached' },
				],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(2);
			expect(executionLog).toEqual(['first', 'stop']);
		});

		test('should handle unregistered action type', async () => {
			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'non-existent', name: 'test' }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('No handler registered');
		});
	});
});
