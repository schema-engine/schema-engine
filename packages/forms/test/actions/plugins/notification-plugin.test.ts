import { test, expect, describe, beforeEach } from 'vitest';
import type { BuilderActionExecutionContext } from '@/types';
import {
	notificationPlugin,
	NotificationActionSchema,
	type NotificationAction,
} from '@/actions/plugins/notification.plugin';
import { createMockBuilderContext, setupTestEnvironment } from '../__tools';
import { asStandardSchema } from '@/lib/standard-schema';

describe('NotificationPlugin', () => {
	beforeEach(() => {
		setupTestEnvironment();
	});

	describe('Schema Validation', () => {
		test('should validate valid notification action', () => {
			const validAction: NotificationAction = {
				id: 'show-success',
				$type: 'show_notification',
				enabled: true,
				message: 'Form submitted successfully!',
				variant: 'success',
				duration: 4000,
			};

			const result = NotificationActionSchema.parse(validAction);
			expect(result).toEqual(validAction);
		});

		test('should validate notification action with all optional fields', () => {
			const fullAction: NotificationAction = {
				id: 'show-warning',
				$type: 'show_notification',
				description: 'Show a warning message',
				enabled: true,
				triggers: ['form_submit'],
				message: 'Please review your input',
				variant: 'warning',
				duration: 5000,
			};

			const result = NotificationActionSchema.parse(fullAction);
			expect(result).toEqual(fullAction);
		});

		test('should default variant to info', () => {
			const action = {
				id: 'show-info',
				$type: 'show_notification',
				enabled: true,
				message: 'Information message',
			};

			const result = NotificationActionSchema.parse(action);
			expect(result.variant).toBe('info');
		});

		test('should default duration to 3000ms', () => {
			const action = {
				id: 'show-success',
				$type: 'show_notification',
				enabled: true,
				message: 'Success message',
				variant: 'success',
			};

			const result = NotificationActionSchema.parse(action);
			expect(result.duration).toBe(3000);
		});

		test('should reject invalid variant', () => {
			const invalidAction = {
				id: 'show-invalid',
				$type: 'show_notification',
				enabled: true,
				message: 'Invalid message',
				variant: 'invalid',
			};

			expect(() => NotificationActionSchema.parse(invalidAction)).toThrow();
		});

		test('should reject empty message', () => {
			const invalidAction = {
				id: 'show-empty',
				$type: 'show_notification',
				enabled: true,
				message: '', // Empty message
				variant: 'info',
			};

			expect(() => NotificationActionSchema.parse(invalidAction)).toThrow('Message cannot be empty');
		});

		test('should reject negative duration', () => {
			const invalidAction = {
				id: 'show-negative',
				$type: 'show_notification',
				enabled: true,
				message: 'Message',
				variant: 'info',
				duration: -1000,
			};

			expect(() => NotificationActionSchema.parse(invalidAction)).toThrow();
		});
	});

	describe('Plugin Factory', () => {
		test('should create plugin with default configuration', () => {
			const plugin = notificationPlugin();

			expect(plugin.$type).toBe('show_notification');
			expect(typeof plugin.execute).toBe('function');
			expect(plugin.schema).toBe(asStandardSchema(NotificationActionSchema));
			expect(plugin.metadata.defaultTriggers).toEqual(['form_submit_success', 'form_submit_error']);
		});
	});

	describe('Action Execution', () => {
		test('should execute success notification', async () => {
			let successMessage = '';
			let successContext: BuilderActionExecutionContext<NotificationAction> | undefined = undefined;

			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					successMessage = message;
					successContext = context;
				},
			});

			const action: NotificationAction = {
				id: 'success-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Form saved successfully!',
				variant: 'success',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(successMessage).toBe('Form saved successfully!');
			expect(successContext).not.toBeUndefined();
			expect(successContext).toMatchObject({
				formId: context.formId,
				formData: context.formData,
			});
		});

		test('should execute error notification', async () => {
			let errorMessage = '';
			let errorContext: BuilderActionExecutionContext<NotificationAction> | undefined = undefined;

			const plugin = notificationPlugin({
				onError: (message, context) => {
					errorMessage = message;
					errorContext = context;
				},
			});

			const action: NotificationAction = {
				id: 'error-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Form submission failed!',
				variant: 'error',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(errorMessage).toBe('Form submission failed!');
			expect(errorContext).not.toBeUndefined();
			expect(errorContext).toMatchObject({
				formId: context.formId,
				formData: context.formData,
			});
		});

		test('should execute warning notification', async () => {
			let warningMessage = '';
			let warningContext: BuilderActionExecutionContext<NotificationAction> | undefined = undefined;

			const plugin = notificationPlugin({
				onWarning: (message, context) => {
					warningMessage = message;
					warningContext = context;
				},
			});

			const action: NotificationAction = {
				id: 'warning-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Please review your input',
				variant: 'warning',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(warningMessage).toBe('Please review your input');
			expect(warningContext).not.toBeUndefined();
			expect(warningContext).toMatchObject({
				formId: context.formId,
				formData: context.formData,
			});
		});

		test('should execute info notification', async () => {
			let infoMessage = '';
			let infoContext: BuilderActionExecutionContext<NotificationAction> | undefined = undefined;

			const plugin = notificationPlugin({
				onInfo: (message, context) => {
					infoMessage = message;
					infoContext = context;
				},
			});

			const action: NotificationAction = {
				id: 'info-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Form auto-saved',
				variant: 'info',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(infoMessage).toBe('Form auto-saved');
			expect(infoContext).not.toBeUndefined();
			expect(infoContext).toMatchObject({
				formId: context.formId,
				formData: context.formData,
			});
		});

		test('should use global notification handler when available', async () => {
			let globalMessage = '';
			let globalVariant = '';
			let globalContext: BuilderActionExecutionContext<NotificationAction> | undefined = undefined;

			const plugin = notificationPlugin({
				onNotification: (message, variant, context) => {
					globalMessage = message;
					globalVariant = variant;
					globalContext = context;
				},
			});

			const action: NotificationAction = {
				id: 'global-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Global notification',
				variant: 'success',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(globalMessage).toBe('Global notification');
			expect(globalVariant).toBe('success');
			expect(globalContext).not.toBeUndefined();
			expect(globalContext).toMatchObject({
				formId: context.formId,
				formData: context.formData,
			});
		});

		test('should prefer specific handlers over global handler', async () => {
			let specificCalled = false;
			let globalCalled = false;

			const plugin = notificationPlugin({
				onSuccess: () => {
					specificCalled = true;
				},
			});

			const action: NotificationAction = {
				id: 'prefer-specific',
				$type: 'show_notification',
				enabled: true,
				message: 'Success message',
				variant: 'success',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(specificCalled).toBe(true);
			expect(globalCalled).toBe(false);
		});

		test('should use global handler when provided (takes precedence)', async () => {
			let specificCalled = false;
			let globalCalled = false;
			let globalMessage = '';

			const plugin = notificationPlugin({
				onSuccess: () => {
					specificCalled = true;
				},
				onNotification: (message) => {
					globalCalled = true;
					globalMessage = message;
				},
			});

			const action: NotificationAction = {
				id: 'global-precedence',
				$type: 'show_notification',
				enabled: true,
				message: 'Global takes precedence',
				variant: 'success',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(specificCalled).toBe(false);
			expect(globalCalled).toBe(true);
			expect(globalMessage).toBe('Global takes precedence');
		});

		test('should fall back to global handler when specific handler not available', async () => {
			let globalMessage = '';
			let globalVariant = '';

			const plugin = notificationPlugin({
				onSuccess: () => {},
				onNotification: (message, variant) => {
					globalMessage = message;
					globalVariant = variant;
				},
			});

			const action: NotificationAction = {
				id: 'fallback-global',
				$type: 'show_notification',
				enabled: true,
				message: 'Error message',
				variant: 'error',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(globalMessage).toBe('Error message');
			expect(globalVariant).toBe('error');
		});

		test('should handle action with message', async () => {
			const plugin = notificationPlugin({
				onSuccess: () => {},
			});

			const action: NotificationAction = {
				id: 'titled-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Success message',
				variant: 'success',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(action.message).toBe('Success message');
		});

		test('should handle action with custom duration', async () => {
			const plugin = notificationPlugin();

			const action: NotificationAction = {
				id: 'custom-duration',
				$type: 'show_notification',
				enabled: true,
				message: 'Custom duration message',
				variant: 'info',
				duration: 10000,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(action.duration).toBe(10000);
		});

		test('should return success when no handlers are configured', async () => {
			const plugin = notificationPlugin();

			const action: NotificationAction = {
				id: 'no-handlers',
				$type: 'show_notification',
				enabled: true,
				message: 'No handlers configured',
				variant: 'info',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Notification 'No handlers configured' shown");
		});

		test('should handle async notification handlers', async () => {
			let asyncHandlerCalled = false;

			const plugin = notificationPlugin({
				onSuccess: async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					asyncHandlerCalled = true;
				},
			});

			const action: NotificationAction = {
				id: 'async-notify',
				$type: 'show_notification',
				enabled: true,
				message: 'Async notification',
				variant: 'success',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(asyncHandlerCalled).toBe(true);
		});
	});

	describe('Integration', () => {
		test('should execute successfully with plugin', async () => {
			const plugin = notificationPlugin();

			const action: NotificationAction = {
				id: 'integration-test',
				$type: 'show_notification',
				enabled: true,
				message: 'Integration test message',
				variant: 'info',
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);
			expect(result.success).toBe(true);
		});

		test('should work with different notification systems', async () => {
			const toastMessages: string[] = [];

			const toastPlugin = notificationPlugin({
				onSuccess: (message) => {
					toastMessages.push(`TOAST: ${message}`);
				},
				onError: (message) => {
					toastMessages.push(`TOAST ERROR: ${message}`);
				},
			});

			const successAction: NotificationAction = {
				id: 'toast-success',
				$type: 'show_notification',
				enabled: true,
				message: 'Toast success message',
				variant: 'success',
			};

			const errorAction: NotificationAction = {
				id: 'toast-error',
				$type: 'show_notification',
				enabled: true,
				message: 'Toast error message',
				variant: 'error',
			};

			await toastPlugin.execute(createMockBuilderContext(successAction));
			await toastPlugin.execute(createMockBuilderContext(errorAction));

			expect(toastMessages).toEqual(['TOAST: Toast success message', 'TOAST ERROR: Toast error message']);
		});
	});
});
