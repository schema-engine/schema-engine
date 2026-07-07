import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Config Validation', () => {
	let registry: MockActionRegistry;
	let executionLog: string[];

	beforeEach(() => {
		registry = new MockActionRegistry();
		executionLog = [];
	});

	test('should return Standard Schema issues for invalid config', async () => {
		registry.register({
			$type: 'validated-action',
			schema: z.object({
				id: z.string(),
				$type: z.literal('validated-action'),
				name: z.string().min(1),
			}),
			metadata: {
				name: 'Validated Action',
				description: 'Requires valid config',
				defaultTriggers: ['submit'],
			},
			execute: async () => {
				executionLog.push('executed');
				return { success: true };
			},
		});

		const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
		const results = await executor.execute({
			actions: [{ id: 'action-1', $type: 'validated-action', name: '' }],
			trigger: 'submit',
			context: createContext(),
		});

		expect(results).toHaveLength(1);
		expect(results[0].success).toBe(false);
		expect(results[0].issues).toBeDefined();
		expect(results[0].issues!.length).toBeGreaterThan(0);
		expect(results[0].issues![0].message).toBeTruthy();
		expect(results[0].error).toBeTruthy();
		expect(executionLog).toEqual([]);
	});

	test('should execute when config passes Standard Schema validation', async () => {
		registry.register({
			$type: 'validated-action',
			schema: z.object({
				id: z.string(),
				$type: z.literal('validated-action'),
				name: z.string().min(1),
			}),
			metadata: {
				name: 'Validated Action',
				description: 'Requires valid config',
				defaultTriggers: ['submit'],
			},
			execute: async (context) => {
				executionLog.push(context.config.name);
				return { success: true };
			},
		});

		const executor = new ActionExecutor<TestContext, TestTrigger>(registry);
		const results = await executor.execute({
			actions: [{ id: 'action-1', $type: 'validated-action', name: 'valid' }],
			trigger: 'submit',
			context: createContext(),
		});

		expect(results).toHaveLength(1);
		expect(results[0].success).toBe(true);
		expect(results[0].issues).toBeUndefined();
		expect(executionLog).toEqual(['valid']);
	});
});
