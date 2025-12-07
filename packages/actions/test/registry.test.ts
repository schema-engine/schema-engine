import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionRegistry } from '../src/registry';
import type { ActionRegistration } from '../src/types';
import { z } from 'zod';

type TestTrigger = 'submit' | 'change' | 'mount';

interface TestContext {
	id: string;
	data: Record<string, unknown>;
}

interface TestConfig {
	id: string;
	$type: string;
	enabled?: boolean;
}

describe('ActionRegistry', () => {
	let registry: ActionRegistry<TestContext, TestTrigger>;

	const mockAction: ActionRegistration<'log', TestContext, TestTrigger> = {
		$type: 'log',
		schema: z.object({
			id: z.string(),
			$type: z.literal('log'),
			message: z.string(),
		}),
		metadata: {
			name: 'Log Action',
			description: 'Logs a message',
			defaultTriggers: ['submit' as TestTrigger],
		},
		execute: async (context) => {
			console.log(context);
			return { success: true };
		},
	};

	const anotherAction: ActionRegistration<'api', TestContext, TestTrigger> = {
		$type: 'api',
		schema: z.object({
			id: z.string(),
			$type: z.literal('api'),
			url: z.string(),
		}),
		metadata: {
			name: 'API Action',
			description: 'Calls an API',
			defaultTriggers: ['submit' as TestTrigger],
		},
		execute: async () => {
			return { success: true };
		},
	};

	beforeEach(() => {
		registry = new ActionRegistry<TestConfig, TestContext, TestTrigger>();
	});

	describe('register', () => {
		test('should register an action', () => {
			registry.register(mockAction);

			expect(registry.has('log')).toBe(true);
			expect(registry.getAction('log')).toEqual(mockAction);
		});

		test('should allow registering multiple actions', () => {
			registry.register(mockAction);
			registry.register(anotherAction);

			expect(registry.size).toBe(2);
			expect(registry.has('log')).toBe(true);
			expect(registry.has('api')).toBe(true);
		});

		test('should override when registering duplicate type', () => {
			const updated: ActionRegistration<'log', TestContext, TestTrigger> = {
				...mockAction,
				metadata: {
					...mockAction.metadata,
					name: 'Updated Log Action',
				},
			};

			registry.register(mockAction);
			registry.register(updated);

			expect(registry.size).toBe(1);
			expect(registry.getAction('log')?.metadata.name).toBe('Updated Log Action');
		});
	});

	describe('has', () => {
		test('should return true for registered action', () => {
			registry.register(mockAction);
			expect(registry.has('log')).toBe(true);
		});

		test('should return false for unregistered action', () => {
			expect(registry.has('non-existent')).toBe(false);
		});
	});

	describe('getAction', () => {
		test('should retrieve registered action', () => {
			registry.register(mockAction);
			const retrieved = registry.getAction('log');

			expect(retrieved).toEqual(mockAction);
		});

		test('should return undefined for unregistered action', () => {
			const retrieved = registry.getAction('non-existent');
			expect(retrieved).toBeUndefined();
		});
	});

	describe('getAll', () => {
		test('should return empty array when no actions registered', () => {
			expect(registry.getAll()).toEqual([]);
		});

		test('should return all registered actions', () => {
			registry.register(mockAction);
			registry.register(anotherAction);

			const all = registry.getAll();
			expect(all).toHaveLength(2);
			expect(all).toContain(mockAction);
			expect(all).toContain(anotherAction);
		});
	});

	describe('getActionTypes', () => {
		test('should return empty array when no actions registered', () => {
			expect(registry.getActionTypes()).toEqual([]);
		});

		test('should return all registered types', () => {
			registry.register(mockAction);
			registry.register(anotherAction);

			const types = registry.getActionTypes();
			expect(types).toHaveLength(2);
			expect(types).toContain('log');
			expect(types).toContain('api');
		});
	});

	describe('getDefaultTriggers', () => {
		test('should return default triggers for registered action', () => {
			registry.register(mockAction);
			const triggers = registry.getDefaultTriggers('log');

			expect(triggers).toEqual(['submit']);
		});

		test('should return undefined for unregistered action', () => {
			const triggers = registry.getDefaultTriggers('non-existent');
			expect(triggers).toBeUndefined();
		});

		test('should return undefined when action has no default triggers', () => {
			const actionWithoutTriggers: ActionRegistration<'custom', TestContext, TestTrigger> = {
				$type: 'custom',
				schema: z.any(),
				metadata: {
					name: 'Custom Action',
					description: 'A custom action',
				},
				execute: async () => ({ success: true }),
			};

			registry.register(actionWithoutTriggers);
			const triggers = registry.getDefaultTriggers('custom');

			expect(triggers).toBeUndefined();
		});
	});

	describe('size', () => {
		test('should return 0 for empty registry', () => {
			expect(registry.size).toBe(0);
		});

		test('should return correct count', () => {
			registry.register(mockAction);
			expect(registry.size).toBe(1);

			registry.register(anotherAction);
			expect(registry.size).toBe(2);
		});
	});

	describe('clear', () => {
		test('should remove all actions', () => {
			registry.register(mockAction);
			registry.register(anotherAction);
			expect(registry.size).toBe(2);

			registry.clear();

			expect(registry.size).toBe(0);
			expect(registry.has('log')).toBe(false);
			expect(registry.has('api')).toBe(false);
		});
	});
});
