import { describe, test, expect, beforeEach } from 'bun:test';
import { ActionRegistry } from '@schema-engine/actions';
import type { BuilderActionRegistration, BuilderActionExecutionContext } from '@/types';
import { z } from 'zod';

describe('ActionRegistry', () => {
	let registry: ActionRegistry;

	const mockAction: BuilderActionRegistration<'log', { message: string }> = {
		$type: 'log',
		schema: z.object({ message: z.string() }),
		metadata: {
			name: 'Log Action',
			description: 'Logs a message',
			defaultTriggers: ['form_submit'],
		},
		handler: async (executionContext, config) => {
			console.log(config.message);
			return { success: true };
		},
	};

	const anotherAction: BuilderActionRegistration<'submit', { url: string }> = {
		$type: 'submit',
		schema: z.object({ url: z.string() }),
		metadata: {
			name: 'Submit Action',
			description: 'Submits form data',
			defaultTriggers: ['form_submit'],
		},
		handler: async () => {
			return { success: true };
		},
	};

	beforeEach(() => {
		registry = new ActionRegistry();
	});

	describe('register', () => {
		test('should register an action', () => {
			registry.register(mockAction);

			expect(registry.has('log')).toBe(true);
			const retrieved = registry.getAction('log');
			expect(retrieved?.$type).toBe('log');
			expect(retrieved?.metadata.name).toBe('Log Action');
			expect(retrieved?.metadata.description).toBe('Logs a message');
		});

		test('should allow registering multiple actions', () => {
			registry.register(mockAction);
			registry.register(anotherAction);

			expect(registry.size).toBe(2);
			expect(registry.has('log')).toBe(true);
			expect(registry.has('submit')).toBe(true);
		});

		test('should override when registering duplicate id', () => {
			const updated: BuilderActionRegistration<'log', { message: string }> = {
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

			expect(retrieved?.$type).toBe('log');
			expect(retrieved?.metadata.name).toBe('Log Action');
			expect(retrieved?.metadata.description).toBe('Logs a message');
			expect(retrieved?.metadata.defaultTriggers).toEqual(['form_submit']);
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
			expect(all.map((a) => a.$type).sort()).toEqual(['log', 'submit']);
			expect(all.find((a) => a.$type === 'log')?.metadata.name).toBe('Log Action');
			expect(all.find((a) => a.$type === 'submit')?.metadata.name).toBe('Submit Action');
		});
	});

	describe('getActionTypes', () => {
		test('should return empty array when no actions registered', () => {
			expect(registry.getActionTypes()).toEqual([]);
		});

		test('should return all registered ids', () => {
			registry.register(mockAction);
			registry.register(anotherAction);

			const keys = registry.getActionTypes();
			expect(keys).toHaveLength(2);
			expect(keys).toContain('log');
			expect(keys).toContain('submit');
		});
	});

	describe('getDefaultTriggers', () => {
		test('should return default triggers for registered action', () => {
			registry.register(mockAction);
			const triggers = registry.getDefaultTriggers('log');

			expect(triggers).toEqual(['form_submit']);
		});

		test('should return undefined for unregistered action', () => {
			const triggers = registry.getDefaultTriggers('non-existent');
			expect(triggers).toBeUndefined();
		});

		test('should return undefined when action has no default triggers', () => {
			const actionWithoutTriggers: BuilderActionRegistration<'custom', Record<string, never>> = {
				$type: 'custom',
				schema: z.object({}),
				metadata: {
					name: 'Custom Action',
					description: 'A custom action',
				},
				handler: async () => ({ success: true }),
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
			expect(registry.has('submit')).toBe(false);
		});
	});
});
