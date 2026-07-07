import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Action Results', () => {
	let registry: MockActionRegistry;

	beforeEach(() => {
		registry = new MockActionRegistry();
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'message-action', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'data-action', name: 'test' }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results[0].data).toEqual({ userId: '123', status: 'created' });
		});

		test('should return result with redirectUrl', async () => {
			registry.register({
				$type: 'redirect-action',
				schema: z.any(),
				metadata: {
					name: 'Redirect Action',
					description: 'Returns redirect',
					defaultTriggers: ['submit'],
				},
				execute: async () => ({
					success: true,
					redirectUrl: '/success',
				}),
			});

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'redirect-action', name: 'test' }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results[0].redirectUrl).toBe('/success');
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'result-action', name: 'first' },
					{ id: 'action-2', $type: 'result-action', name: 'second' },
				],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toHaveLength(2);
			expect(results[0].data).toEqual({ actionName: 'first' });
			expect(results[1].data).toEqual({ actionName: 'second' });
		});
	});
});
