import { describe, test, expect } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import type { BuilderActionRegistration, BuilderActionRuntimeContext } from '@/types';
import * as z from 'zod/mini';
import type { ActionExecutionResult } from '@schema-engine/actions';

const logActionSchema = z.object({ id: z.string(), $type: z.literal('log'), message: z.string() });
const submitActionSchema = z.object({ id: z.string(), $type: z.literal('submit'), url: z.string() });

type LogActionConfig = z.output<typeof logActionSchema>;
type SubmitActionConfig = z.output<typeof submitActionSchema>;

describe('form action registrations', () => {
	const mockAction: BuilderActionRegistration<'log', typeof logActionSchema> = {
		$type: 'log',
		schema: logActionSchema,
		metadata: {
			name: 'Log Action',
			description: 'Logs a message',
			defaultTriggers: ['form_submit'],
		},
		execute(_context: BuilderActionRuntimeContext<LogActionConfig>): Promise<ActionExecutionResult> {
			return Promise.resolve({ success: true });
		},
	};

	const anotherAction: BuilderActionRegistration<'submit', typeof submitActionSchema> = {
		$type: 'submit',
		schema: submitActionSchema,
		metadata: {
			name: 'Submit Action',
			description: 'Submits form data',
			defaultTriggers: ['form_submit'],
		},
		execute: async (_context: BuilderActionRuntimeContext<SubmitActionConfig>): Promise<ActionExecutionResult> => {
			return { success: true };
		},
	};

	describe('register', () => {
		test('should register an action', () => {
			const engine = createFormEngine({ actions: [mockAction] });

			expect(engine.actions.has('log')).toBe(true);
			const retrieved = engine.actions.get('log');
			expect(retrieved?.$type).toBe('log');
			expect(retrieved?.metadata.name).toBe('Log Action');
			expect(retrieved?.metadata.description).toBe('Logs a message');
		});

		test('should allow registering multiple actions', () => {
			const engine = createFormEngine({ actions: [mockAction, anotherAction] });

			expect(engine.actions.all().length).toBe(2);
			expect(engine.actions.has('log')).toBe(true);
			expect(engine.actions.has('submit')).toBe(true);
		});

		test('should override when registering duplicate id', () => {
			const updated: BuilderActionRegistration<'log', typeof logActionSchema> = {
				...mockAction,
				metadata: {
					...mockAction.metadata,
					name: 'Updated Log Action',
				},
			};

			const engine = createFormEngine({ actions: [mockAction, updated] });

			expect(engine.actions.all().length).toBe(1);
			expect(engine.actions.get('log')?.metadata.name).toBe('Updated Log Action');
		});
	});

	describe('has', () => {
		test('should return true for registered action', () => {
			const engine = createFormEngine({ actions: [mockAction] });
			expect(engine.actions.has('log')).toBe(true);
		});

		test('should return false for unregistered action', () => {
			const engine = createFormEngine();
			expect(engine.actions.has('non-existent')).toBe(false);
		});
	});

	describe('get', () => {
		test('should retrieve registered action', () => {
			const engine = createFormEngine({ actions: [mockAction] });
			const retrieved = engine.actions.get('log');

			expect(retrieved?.$type).toBe('log');
			expect(retrieved?.metadata.name).toBe('Log Action');
			expect(retrieved?.metadata.description).toBe('Logs a message');
			expect(retrieved?.metadata.defaultTriggers).toEqual(['form_submit']);
		});

		test('should return undefined for unregistered action', () => {
			const engine = createFormEngine();
			const retrieved = engine.actions.get('non-existent');
			expect(retrieved).toBeUndefined();
		});
	});

	describe('all', () => {
		test('should return empty array when no actions registered', () => {
			const engine = createFormEngine();
			expect(engine.actions.all()).toEqual([]);
		});

		test('should return all registered actions', () => {
			const engine = createFormEngine({ actions: [mockAction, anotherAction] });

			const all = engine.actions.all();
			expect(all).toHaveLength(2);
			expect(all.map((a) => a.$type).toSorted((a, b) => a.localeCompare(b))).toEqual(['log', 'submit']);
			expect(all.find((a) => a.$type === 'log')?.metadata.name).toBe('Log Action');
			expect(all.find((a) => a.$type === 'submit')?.metadata.name).toBe('Submit Action');
		});
	});

	describe('keys', () => {
		test('should return empty array when no actions registered', () => {
			const engine = createFormEngine();
			expect(engine.actions.keys()).toEqual([]);
		});

		test('should return all registered ids', () => {
			const engine = createFormEngine({ actions: [mockAction, anotherAction] });

			const keys = engine.actions.keys();
			expect(keys).toHaveLength(2);
			expect(keys).toContain('log');
			expect(keys).toContain('submit');
		});
	});
});
