import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Empty and Edge Cases', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
	});

	describe('Empty and Edge Cases', () => {
		test('should handle empty actions array', async () => {
			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({ actions: [], trigger: 'submit', context: createContext() });

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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'mount-only', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'no-triggers', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const results = await executor.execute({
				actions: [{ id: 'action-1', $type: 'empty-triggers', name: 'test', triggers: [] }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(results).toEqual([]);
		});
	});
});
