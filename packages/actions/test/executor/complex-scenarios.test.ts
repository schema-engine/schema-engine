import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestActionConfig, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Complex Scenarios', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'complex-action', name: 'enabled-match' },
					{ id: 'action-2', $type: 'complex-action', name: 'disabled', enabled: false },
					{ id: 'action-3', $type: 'complex-action', name: 'wrong-trigger', triggers: ['mount'] },
					{ id: 'action-4', $type: 'complex-action', name: 'custom-match', triggers: ['submit'] },
				],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'type-a', name: 'a1' },
					{ id: 'action-2', $type: 'type-b', name: 'b1' },
					{ id: 'action-3', $type: 'type-a', name: 'a2' },
				],
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

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
			await executor.execute({
				actions: [
					{ id: 'action-1', $type: 'stateful-action', name: 'first', value: 'one' },
					{ id: 'action-2', $type: 'stateful-action', name: 'second', value: 'two' },
					{ id: 'action-3', $type: 'stateful-action', name: 'read' },
				],
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

		const executor = new ActionExecutor(registry);
		await executor.execute({
			actions: [{ id: 'child', $type: 'test-action', name: 'child' }],
			trigger: 'submit',
			context: createContext(),
			triggeredBy: triggerAction,
		});

		expect(receivedTriggeredBy).toEqual(triggerAction);
	});
});
