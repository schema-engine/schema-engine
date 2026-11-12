import { describe, test, expect } from 'vitest';
import { ActionRegistry } from '../src/registry';
import type { ActionRegistration } from '../src/types';
import * as z from 'zod/mini';

type TestTrigger = 'submit' | 'change' | 'mount';

interface LogActionConfig {
	id: string;
	$type: 'log';
	message: string;
}

interface ApiActionConfig {
	id: string;
	$type: 'api';
	url: string;
}

interface TestContext {
	id: string;
	data: Record<string, unknown>;
}

describe('ActionRegistry', () => {
	const mockAction: ActionRegistration<LogActionConfig, TestContext, TestTrigger> = {
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

	const anotherAction: ActionRegistration<ApiActionConfig, TestContext, TestTrigger> = {
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

	type Registrations = ConstructorParameters<typeof ActionRegistry<TestContext, TestTrigger>>[0];
	const build = (...actions: Registrations[number][]) => new ActionRegistry<TestContext, TestTrigger>(actions);

	describe('construction', () => {
		test('should store the registrations it is built from', () => {
			const registry = build(mockAction, anotherAction);

			expect(registry.size).toBe(2);
			expect(registry.has('log')).toBe(true);
			expect(registry.has('api')).toBe(true);
			expect(registry.getAction('log')).toEqual(mockAction);
		});

		test('should let the last registration of a type win', () => {
			const updated: ActionRegistration<LogActionConfig, TestContext, TestTrigger> = {
				...mockAction,
				metadata: {
					...mockAction.metadata,
					name: 'Updated Log Action',
				},
			};

			const registry = build(mockAction, updated);

			expect(registry.size).toBe(1);
			expect(registry.getAction('log')?.metadata.name).toBe('Updated Log Action');
		});

		test('should reject a registration whose schema is not a Standard Schema', () => {
			const broken = { ...mockAction, schema: {} } as unknown as ActionRegistration<
				LogActionConfig,
				TestContext,
				TestTrigger
			>;

			expect(() => build(broken)).toThrow(/Action 'log' schema must implement Standard Schema/);
		});

		test('should allow subclasses with their own fields', () => {
			class ExtendedRegistry extends ActionRegistry<TestContext, TestTrigger> {
				readonly extra = 1;
			}

			const registry = new ExtendedRegistry([mockAction]);

			expect(registry.extra).toBe(1);
			expect(registry.getAction('log')).toEqual(mockAction);
		});

		test('should be read-only', () => {
			const registry = build(mockAction);

			expect(registry).not.toHaveProperty('register');
			expect(registry).not.toHaveProperty('clear');
			expect(Object.isFrozen(registry.getAction('log'))).toBe(true);
		});
	});

	describe('has', () => {
		test('should return true for registered action', () => {
			expect(build(mockAction).has('log')).toBe(true);
		});

		test('should return false for unregistered action', () => {
			expect(build().has('non-existent')).toBe(false);
		});
	});

	describe('getAction', () => {
		test('should retrieve registered action', () => {
			expect(build(mockAction).getAction('log')).toEqual(mockAction);
		});

		test('should return undefined for unregistered action', () => {
			expect(build().getAction('non-existent')).toBeUndefined();
		});
	});

	describe('all', () => {
		test('should return empty array when no actions registered', () => {
			expect(build().all()).toEqual([]);
		});

		test('should return all registered actions', () => {
			const all = build(mockAction, anotherAction).all();

			expect(all).toHaveLength(2);
			expect(all).toEqual([mockAction, anotherAction]);
		});
	});

	describe('getActionTypes', () => {
		test('should return empty array when no actions registered', () => {
			expect(build().getActionTypes()).toEqual([]);
		});

		test('should return all registered types', () => {
			expect(build(mockAction, anotherAction).getActionTypes()).toEqual(['log', 'api']);
		});
	});

	describe('size', () => {
		test('should return 0 for empty registry', () => {
			expect(build().size).toBe(0);
		});

		test('should return correct count', () => {
			expect(build(mockAction).size).toBe(1);
			expect(build(mockAction, anotherAction).size).toBe(2);
		});
	});
});
