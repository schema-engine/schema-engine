import { describe, test, expect, beforeEach } from 'bun:test';
import { FormEngineBuilder } from '@/builder/form-engine-builder';
import type { BuilderActionRegistration, BuilderActionExecutionContext } from '@/types';
import { z } from 'zod';
import type { ActionExecutionResult } from '@schema-engine/actions';

describe('ActionRegistry', () => {
	let builder: FormEngineBuilder;

	const mockAction: BuilderActionRegistration<'log', { message: string }> = {
		$type: 'log',
		schema: z.object({ message: z.string() }),
		metadata: {
			name: 'Log Action',
			description: 'Logs a message',
			defaultTriggers: ['form_submit'],
		},
		execute(_context: BuilderActionExecutionContext<{ message: string }>): Promise<ActionExecutionResult> {
			return Promise.resolve({ success: true });
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
		execute: async (_context: BuilderActionExecutionContext<{ url: string }>): Promise<ActionExecutionResult> => {
			return { success: true };
		},
	};

	beforeEach(() => {
		builder = new FormEngineBuilder();
	});

	describe('register', () => {
		test('should register an action', () => {
			builder.addAction(mockAction);
			const engine = builder.build();

			expect(engine.hasAction('log')).toBe(true);
			const retrieved = engine.getAction('log');
			expect(retrieved?.$type).toBe('log');
			expect(retrieved?.metadata.name).toBe('Log Action');
			expect(retrieved?.metadata.description).toBe('Logs a message');
		});

		test('should allow registering multiple actions', () => {
			builder.addAction(mockAction);
			builder.addAction(anotherAction);
			const engine = builder.build();

			expect(engine.getAllActions().length).toBe(2);
			expect(engine.hasAction('log')).toBe(true);
			expect(engine.hasAction('submit')).toBe(true);
		});

		test('should override when registering duplicate id', () => {
			const updated: BuilderActionRegistration<'log', { message: string }> = {
				...mockAction,
				metadata: {
					...mockAction.metadata,
					name: 'Updated Log Action',
				},
			};

			builder.addAction(mockAction);
			builder.addAction(updated);
			const engine = builder.build();

			expect(engine.getAllActions().length).toBe(1);
			expect(engine.getAction('log')?.metadata.name).toBe('Updated Log Action');
		});
	});

	describe('has', () => {
		test('should return true for registered action', () => {
			builder.addAction(mockAction);
			const engine = builder.build();
			expect(engine.hasAction('log')).toBe(true);
		});

		test('should return false for unregistered action', () => {
			const engine = builder.build();
			expect(engine.hasAction('non-existent')).toBe(false);
		});
	});

	describe('getAction', () => {
		test('should retrieve registered action', () => {
			builder.addAction(mockAction);
			const engine = builder.build();
			const retrieved = engine.getAction('log');

			expect(retrieved?.$type).toBe('log');
			expect(retrieved?.metadata.name).toBe('Log Action');
			expect(retrieved?.metadata.description).toBe('Logs a message');
			expect(retrieved?.metadata.defaultTriggers).toEqual(['form_submit']);
		});

		test('should return undefined for unregistered action', () => {
			const engine = builder.build();
			const retrieved = engine.getAction('non-existent');
			expect(retrieved).toBeUndefined();
		});
	});

	describe('getAll', () => {
		test('should return empty array when no actions registered', () => {
			const engine = builder.build();
			expect(engine.getAllActions()).toEqual([]);
		});

		test('should return all registered actions', () => {
			builder.addAction(mockAction);
			builder.addAction(anotherAction);
			const engine = builder.build();

			const all = engine.getAllActions();
			expect(all).toHaveLength(2);
			expect(all.map((a) => a.$type).toSorted((a, b) => a.localeCompare(b))).toEqual(['log', 'submit']);
			expect(all.find((a) => a.$type === 'log')?.metadata.name).toBe('Log Action');
			expect(all.find((a) => a.$type === 'submit')?.metadata.name).toBe('Submit Action');
		});
	});

	describe('getActionTypes', () => {
		test('should return empty array when no actions registered', () => {
			const engine = builder.build();
			expect(engine.getActionTypes()).toEqual([]);
		});

		test('should return all registered ids', () => {
			builder.addAction(mockAction);
			builder.addAction(anotherAction);
			const engine = builder.build();

			const keys = engine.getActionTypes();
			expect(keys).toHaveLength(2);
			expect(keys).toContain('log');
			expect(keys).toContain('submit');
		});
	});
});
