import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { ActionExecutor } from '../../src/executor';
import { MockActionRegistry, createContext, type TestContext, type TestTrigger } from './test-utils';
import { z } from 'zod';

describe('ActionExecutor / Debug Logging', () => {
	let registry: MockActionRegistry;

	beforeEach(() => {
		registry = new MockActionRegistry();
	});

	describe('Debug Logging', () => {
		let debugSpy: ReturnType<typeof spyOn>;
		let warnSpy: ReturnType<typeof spyOn>;
		let errorSpy: ReturnType<typeof spyOn>;

		beforeEach(() => {
			debugSpy = spyOn(console, 'debug').mockImplementation(() => {});
			warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
			errorSpy = spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			debugSpy.mockRestore();
			warnSpy.mockRestore();
			errorSpy.mockRestore();
		});

		test('should not log when debug is disabled', async () => {
			registry.register({
				$type: 'test-action',
				schema: z.any(),
				metadata: {
					name: 'Test Action',
					description: 'Test',
					defaultTriggers: ['submit'],
				},
				execute: async () => ({ success: true }),
			});

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry, { debug: false });
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'test-action', name: 'test' }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(debugSpy).not.toHaveBeenCalled();
			expect(warnSpy).not.toHaveBeenCalled();
			expect(errorSpy).not.toHaveBeenCalled();

			registry.clear();
		});

		test('should log when debug is enabled', async () => {
			registry.register({
				$type: 'test-action',
				schema: z.any(),
				metadata: {
					name: 'Test Action',
					description: 'Test',
					defaultTriggers: ['submit'],
				},
				execute: async () => ({ success: true }),
			});

			const executor = new ActionExecutor<TestContext, TestTrigger>(registry, { debug: true });
			await executor.execute({
				actions: [{ id: 'action-1', $type: 'test-action', name: 'test' }],
				trigger: 'submit',
				context: createContext(),
			});

			expect(debugSpy).toHaveBeenCalled();

			registry.clear();
		});
	});
});
