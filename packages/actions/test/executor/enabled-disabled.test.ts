import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Enabled/Disabled Actions', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'test-action', name: 'test', enabled: false }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'test-action', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'test-action', name: 'test', enabled: true }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['executed']);
		});
	});
});
