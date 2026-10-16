import { describe, test, expect, beforeEach } from 'vitest';
import type { BuilderActionExecutionContext } from '@/types';
import {
	formResetPlugin as createFormResetPlugin,
	FormResetActionSchema,
	type FormResetAction,
	type FormResetPluginConfig,
} from '@/actions/plugins/form-reset.plugin';
import { getAutoSaveDraftStorageKey } from '@/actions/plugins/auto-save.plugin';
import { createMockBuilderContext } from '../__tools';
import { MockAutoSaveStorage } from '../__tools/storage-utils';

let storage: MockAutoSaveStorage;

function createResetPlugin(config: Omit<FormResetPluginConfig, 'storage'> = {}) {
	return createFormResetPlugin({ storage, ...config });
}

describe('ResetPlugin', () => {
	beforeEach(() => {
		storage = new MockAutoSaveStorage();
	});

	describe('Schema Validation', () => {
		test('should validate valid reset action', () => {
			const validAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
			};

			expect(FormResetActionSchema.parse(validAction)).toEqual({
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			});
		});

		test('should validate reset action with all optional fields', () => {
			const validAction = {
				id: 'test-reset',
				$type: 'reset',
				description: 'Reset form to initial state',
				enabled: true,
				triggers: ['form_submit_error'],
				confirmMessage: 'Are you sure you want to reset?',
				resetToDefaults: false,
			};

			expect(FormResetActionSchema.parse(validAction)).toEqual({
				id: 'test-reset',
				$type: 'reset',
				description: 'Reset form to initial state',
				enabled: true,
				triggers: ['form_submit_error'],
				confirmMessage: 'Are you sure you want to reset?',
				resetToDefaults: false,
			});
			const invalidAction = {
				id: 'test-reset',
				$type: 'invalid',
				enabled: true,
			};

			expect(() => FormResetActionSchema.parse(invalidAction)).toThrow();
		});

		test('should require ID', () => {
			const invalidAction = {
				$type: 'reset',
				enabled: true,
			};

			expect(() => FormResetActionSchema.parse(invalidAction)).toThrow();
		});

		test('should default resetToDefaults to true', () => {
			const action = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
			};

			const parsed = FormResetActionSchema.parse(action);
			expect(parsed.resetToDefaults).toBe(true);
		});

		test('should default enabled to true', () => {
			const action = {
				id: 'test-reset',
				$type: 'reset',
			};

			const parsed = FormResetActionSchema.parse(action);
			expect(parsed.enabled).toBe(true);
		});
	});

	describe('Plugin Factory', () => {
		test('should create plugin with default configuration', () => {
			const plugin = createResetPlugin();

			expect(plugin.$type).toBe('reset');
			expect(plugin.schema).toBe(FormResetActionSchema);
			expect(plugin.metadata.defaultTriggers).toEqual(['form_submit_success']);
			expect(typeof plugin.execute).toBe('function');
		});
	});

	describe('Action Execution', () => {
		test('should execute successful reset action', async () => {
			let formResetCalled = false;

			const plugin = createResetPlugin({
				resetForm: (context) => {
					formResetCalled = true;
					context.form.reset();
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Form reset successfully');
			expect(result.shouldContinue).toBe(true);
			expect(formResetCalled).toBe(true);
		});

		test('should reset with resetToDefaults=true', async () => {
			let resetParams: any[] = [];

			const plugin = createResetPlugin({
				resetForm: (context, resetToDefaults) => {
					context.form.reset();
					resetParams = resetToDefaults ? [] : [{}];
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(resetParams).toEqual([]);
		});

		test('should reset with resetToDefaults=false', async () => {
			let resetParams: any[] = [];

			const plugin = createResetPlugin({
				resetForm: (context, resetToDefaults) => {
					context.form.reset();
					resetParams = resetToDefaults ? [] : [{}];
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: false,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(resetParams).toEqual([{}]);
		});

		test('should call custom reset handler', async () => {
			let customResetContext: BuilderActionExecutionContext<FormResetAction> | undefined = undefined;
			let customResetToDefaults = true;

			const plugin = createResetPlugin({
				resetForm: (context, resetToDefaults) => {
					customResetContext = context;
					customResetToDefaults = resetToDefaults;
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: false,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(customResetContext).toBeTruthy();
			expect(customResetToDefaults).toBe(false);
		});

		test('should call onReset callback', async () => {
			let onResetContext: BuilderActionExecutionContext<FormResetAction> | undefined = undefined;

			const plugin = createResetPlugin({
				onReset: (context) => {
					onResetContext = context;
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(onResetContext).toBeTruthy();
		});

		test('should call clearDraft', async () => {
			let clearDraftFormId = '';

			const plugin = createResetPlugin({
				clearDraft: (formId) => {
					clearDraftFormId = formId;
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(clearDraftFormId).toBe('test-form');
		});

		test('should handle confirmation dialog - confirmed', async () => {
			let confirmMessage = '';

			const plugin = createResetPlugin({
				confirm: (message) => {
					confirmMessage = message;
					return true;
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
				confirmMessage: 'Are you sure?',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(confirmMessage).toBe('Are you sure?');
		});

		test('should handle confirmation dialog - cancelled', async () => {
			let confirmCalled = false;

			const plugin = createResetPlugin({
				confirm: () => {
					confirmCalled = true;
					return false;
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
				confirmMessage: 'Are you sure?',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Reset cancelled by user');
			expect(result.shouldContinue).toBe(true);
			expect(confirmCalled).toBe(true);
		});

		test('should handle async confirmation dialog', async () => {
			let confirmMessage = '';

			const plugin = createResetPlugin({
				confirm: async (message) => {
					confirmMessage = message;
					return new Promise((resolve) => {
						setTimeout(() => resolve(true), 10);
					});
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
				confirmMessage: 'Async confirm?',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(confirmMessage).toBe('Async confirm?');
		});

		test('should not show confirmation without confirmMessage', async () => {
			let confirmCalled = false;

			const plugin = createResetPlugin({
				confirm: () => {
					confirmCalled = true;
					return true;
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(confirmCalled).toBe(false);
		});

		test('should handle errors in custom handlers', async () => {
			const plugin = createResetPlugin({
				resetForm: () => {
					throw new Error('Custom reset failed');
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Custom reset failed');
			expect(result.shouldContinue).toBe(true);
		});

		test('should handle non-Error exceptions', async () => {
			const plugin = createResetPlugin({
				resetForm: () => {
					throw 'String error';
				},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Reset failed');
			expect(result.shouldContinue).toBe(true);
		});
	});

	describe('Integration', () => {
		test('should execute successfully with plugin', async () => {
			const plugin = createResetPlugin({
				onReset: () => {},
			});

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
				confirmMessage: undefined,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Form reset successfully');
		});

		test('should clear the auto-saved draft through the shared storage key', async () => {
			const storageKey = getAutoSaveDraftStorageKey('test-form');
			await storage.save(storageKey, { email: 'ada@example.com' });
			const plugin = createResetPlugin();

			const action: FormResetAction = {
				id: 'test-reset',
				$type: 'reset',
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(await storage.load(storageKey)).toBeNull();
		});
	});
});
