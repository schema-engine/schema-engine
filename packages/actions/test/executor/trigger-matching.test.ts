import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Trigger Matching', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'mount-action', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'mount-action', name: 'test' }],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);

			await executor.execute({
				actions: [
					{
						id: 'action-1',
						$type: 'flexible-action',
						name: 'test',
						triggers: ['submit', 'change'],
					},
				],
				trigger: 'submit',
				context: createContext(),
			});

			expect(executionLog).toEqual(['executed']);
			executionLog = [];

			await executor.execute({
				actions: [
					{
						id: 'action-1',
						$type: 'flexible-action',
						name: 'test',
						triggers: ['submit', 'change'],
					},
				],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			const action = { id: 'action-1', $type: 'multi-trigger', name: 'test' };
			const context = createContext();

			await executor.execute({ actions: [action], trigger: 'mount', context });
			await executor.execute({ actions: [action], trigger: 'submit', context });
			await executor.execute({ actions: [action], trigger: 'change', context });

			expect(executionLog).toEqual(['executed', 'executed', 'executed']);
		});
	});
});
