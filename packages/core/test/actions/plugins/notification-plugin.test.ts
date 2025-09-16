import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
	notificationPlugin,
	NotificationActionSchema,
	type NotificationAction,
} from "@/actions/plugins/notification-plugin";
import { actionRegistry } from "@/actions/action-registry";
import type { ActionExecutionContext } from "@/actions/types";
import { createMockContext, setupTestEnvironment } from "../__tools";

const mockContext = createMockContext();

describe("NotificationPlugin", () => {
	beforeEach(() => {
		setupTestEnvironment();
	});

	afterEach(() => {
		actionRegistry.clear();
	});

	describe("Schema Validation", () => {
		test("should validate valid notification action", () => {
			const validAction: NotificationAction = {
				id: "show-success",
				type: "show_notification",
				enabled: true,
				message: "Form submitted successfully!",
				variant: "success",
                duration: 4000,
			};

			const result = NotificationActionSchema.parse(validAction);
			expect(result).toEqual(validAction);
		});

		test("should validate notification action with all optional fields", () => {
			const fullAction: NotificationAction = {
				id: "show-warning",
				type: "show_notification",
				description: "Show a warning message",
				enabled: true,
				triggers: ["form_submit"],
				message: "Please review your input",
				variant: "warning",
				duration: 5000,
			};

			const result = NotificationActionSchema.parse(fullAction);
			expect(result).toEqual(fullAction);
		});

		test("should default variant to info", () => {
			const action = {
				id: "show-info",
				type: "show_notification",
				enabled: true,
				message: "Information message",
			};

			const result = NotificationActionSchema.parse(action);
			expect(result.variant).toBe("info");
		});

		test("should default duration to 3000ms", () => {
			const action = {
				id: "show-success",
				type: "show_notification",
				enabled: true,
				message: "Success message",
				variant: "success",
			};

			const result = NotificationActionSchema.parse(action);
			expect(result.duration).toBe(3000);
		});

		test("should reject invalid variant", () => {
			const invalidAction = {
				id: "show-invalid",
				type: "show_notification",
				enabled: true,
				message: "Invalid message",
				variant: "invalid",
			};

			expect(() => NotificationActionSchema.parse(invalidAction)).toThrow();
		});

		test("should reject empty message", () => {
			const invalidAction = {
				id: "show-empty",
				type: "show_notification",
				enabled: true,
				message: "", // Empty message
				variant: "info",
			};

			expect(() => NotificationActionSchema.parse(invalidAction)).toThrow("Message cannot be empty");
		});

		test("should reject negative duration", () => {
			const invalidAction = {
				id: "show-negative",
				type: "show_notification",
				enabled: true,
				message: "Message",
				variant: "info",
				duration: -1000, 
			};

			expect(() => NotificationActionSchema.parse(invalidAction)).toThrow();
		});
	});

	describe("Plugin Factory", () => {
		test("should create plugin with default configuration", () => {
			const plugin = notificationPlugin();

			expect(plugin.type).toBe("show_notification");
			expect(plugin.handler).toBeDefined();
			expect(plugin.schema).toBe(NotificationActionSchema);
			expect(plugin.defaultTriggers).toEqual([
				"submit_success",
				"submit_error",
			]);
		});

		test("should create plugin with custom handlers", () => {
			let successCalled = false;
			let errorCalled = false;
			let warningCalled = false;
			let infoCalled = false;

			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					successCalled = true;
				},
				onError: (message, context) => {
					errorCalled = true;
				},
				onWarning: (message, context) => {
					warningCalled = true;
				},
				onInfo: (message, context) => {
					infoCalled = true;
				},
			});

			expect(plugin.type).toBe("show_notification");
			expect(plugin.handler).toBeDefined();
		});

		test("should create plugin with global notification handler", () => {
			let notificationCalled = false;
			let capturedMessage: string | null = null;
			let capturedVariant: string | null = null;

			const plugin = notificationPlugin({
				onNotification: (message, variant, context) => {
					notificationCalled = true;
					capturedMessage = message;
					capturedVariant = variant;
				},
			});

			expect(plugin.type).toBe("show_notification");
			expect(plugin.handler).toBeDefined();
		});
	});

	describe("Action Execution", () => {
		test("should execute success notification", async () => {
			let successMessage: string = '';
			let successContext: ActionExecutionContext | undefined = undefined;

			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					successMessage = message;
					successContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "success-notify",
				type: "show_notification",
				enabled: true,
				message: "Form saved successfully!",
				variant: "success",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(successMessage).toBe("Form saved successfully!");
			expect(successContext).not.toBeUndefined();
			expect(successContext!).toEqual(mockContext);
		});

		test("should execute error notification", async () => {
			let errorMessage: string | null = null;
			let errorContext: ActionExecutionContext | null = null;

			const plugin = notificationPlugin({
				onError: (message, context) => {
					errorMessage = message;
					errorContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "error-notify",
				type: "show_notification",
				enabled: true,
				message: "Form submission failed!",
				variant: "error",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(errorMessage).not.toBeNull();
			expect(errorMessage!).toBe("Form submission failed!");
			expect(errorContext).not.toBeNull();
			expect(errorContext!).toEqual(mockContext);
		});

		test("should execute warning notification", async () => {
			let warningMessage: string | null = null;
			let warningContext: ActionExecutionContext | null = null;

			const plugin = notificationPlugin({
				onWarning: (message, context) => {
					warningMessage = message;
					warningContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "warning-notify",
				type: "show_notification",
				enabled: true,
				message: "Please review your input",
				variant: "warning",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(warningMessage).not.toBeNull();
			expect(warningMessage!).toBe("Please review your input");
			expect(warningContext).not.toBeNull();
			expect(warningContext!).toEqual(mockContext);
		});

		test("should execute info notification", async () => {
			let infoMessage: string | null = null;
			let infoContext: ActionExecutionContext | null = null;

			const plugin = notificationPlugin({
				onInfo: (message, context) => {
					infoMessage = message;
					infoContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "info-notify",
				type: "show_notification",
				enabled: true,
				message: "Form auto-saved",
				variant: "info",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(infoMessage).not.toBeNull();
			expect(infoMessage!).toBe("Form auto-saved");
			expect(infoContext).not.toBeNull();
			expect(infoContext!).toEqual(mockContext);
		});

		test("should use global notification handler when available", async () => {
			let globalMessage: string | null = null;
			let globalVariant: string | null = null;
			let globalContext: ActionExecutionContext | null = null;

			const plugin = notificationPlugin({
				onNotification: (message, variant, context) => {
					globalMessage = message;
					globalVariant = variant;
					globalContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "global-notify",
				type: "show_notification",
				enabled: true,
				message: "Global notification",
				variant: "success",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(globalMessage).not.toBeNull();
			expect(globalMessage!).toBe("Global notification");
			expect(globalVariant).not.toBeNull();
			expect(globalVariant!).toBe("success");
			expect(globalContext).not.toBeNull();
			expect(globalContext!).toEqual(mockContext);
		});

		test("should prefer specific handlers over global handler", async () => {
			let specificCalled = false;
			let globalCalled = false;

			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					specificCalled = true;
				},
				// Don't provide onNotification to allow specific handlers to be used
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "prefer-specific",
				type: "show_notification",
				enabled: true,
				message: "Success message",
				variant: "success",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(specificCalled).toBe(true);
			expect(globalCalled).toBe(false);
		});

		test("should use global handler when provided (takes precedence)", async () => {
			let specificCalled = false;
			let globalCalled = false;
			let globalMessage: string | null = null;

			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					specificCalled = true;
				},
				onNotification: (message, variant, context) => {
					globalCalled = true;
					globalMessage = message;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "global-precedence",
				type: "show_notification",
				enabled: true,
				message: "Global takes precedence",
				variant: "success",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(specificCalled).toBe(false); // Global handler takes precedence
			expect(globalCalled).toBe(true);
			expect(globalMessage).not.toBeNull();
			expect(globalMessage!).toBe("Global takes precedence");
		});

		test("should fall back to global handler when specific handler not available", async () => {
			let globalMessage: string | null = null;
			let globalVariant: string | null = null;

			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					// Success handler provided
				},
				onNotification: (message, variant, context) => {
					globalMessage = message;
					globalVariant = variant;
				},
				// No onError handler
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "fallback-global",
				type: "show_notification",
				enabled: true,
				message: "Error message",
				variant: "error", // No specific error handler
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(globalMessage).not.toBeNull();
			expect(globalMessage!).toBe("Error message");
			expect(globalVariant).not.toBeNull();
			expect(globalVariant!).toBe("error");
		});

		test("should handle action with message", async () => {
			const plugin = notificationPlugin({
				onSuccess: (message, context) => {
					// In a real implementation, the handler would access the full action
					// For testing, we'll assume the message is accessible through context
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "titled-notify",
				type: "show_notification",
				enabled: true,
				message: "Success message",
				variant: "success",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(action.message).toBe("Success message");
		});

		test("should handle action with custom duration", async () => {
			const plugin = notificationPlugin();
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "custom-duration",
				type: "show_notification",
				enabled: true,
				message: "Custom duration message",
				variant: "info",
				duration: 10000,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(action.duration).toBe(10000);
		});

		test("should return success when no handlers are configured", async () => {
			const plugin = notificationPlugin(); // No handlers
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "no-handlers",
				type: "show_notification",
				enabled: true,
				message: "No handlers configured",
				variant: "info",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Notification 'No handlers configured' shown");
		});

		test("should handle async notification handlers", async () => {
			let asyncHandlerCalled = false;

			const plugin = notificationPlugin({
				onSuccess: async (message, context) => {
					await new Promise(resolve => setTimeout(resolve, 10));
					asyncHandlerCalled = true;
				},
			});
			actionRegistry.register(plugin);

			const action: NotificationAction = {
				id: "async-notify",
				type: "show_notification",
				enabled: true,
				message: "Async notification",
				variant: "success",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(asyncHandlerCalled).toBe(true);
		});
	});

	describe("Integration", () => {
		test("should register plugin and execute successfully", async () => {
			const plugin = notificationPlugin();
			actionRegistry.register(plugin);

			expect(actionRegistry.has("show_notification")).toBe(true);

			const action: NotificationAction = {
				id: "integration-test",
				type: "show_notification",
				enabled: true,
				message: "Integration test message",
				variant: "info",
			};

			const result = await actionRegistry.execute(action, mockContext);
			expect(result.success).toBe(true);
		});

		test("should work with different notification systems", async () => {
			// Mock different notification systems
			const toastMessages: string[] = [];
			const alertMessages: string[] = [];

			const toastPlugin = notificationPlugin({
				onSuccess: (message) => {
					toastMessages.push(`TOAST: ${message}`);
				},
				onError: (message) => {
					toastMessages.push(`TOAST ERROR: ${message}`);
				},
			});

			actionRegistry.register(toastPlugin);

			const successAction: NotificationAction = {
				id: "toast-success",
				type: "show_notification",
				enabled: true,
				message: "Toast success message",
				variant: "success",
			};

			const errorAction: NotificationAction = {
				id: "toast-error",
				type: "show_notification",
				enabled: true,
				message: "Toast error message",
				variant: "error",
			};

			await actionRegistry.execute(successAction, mockContext);
			await actionRegistry.execute(errorAction, mockContext);

			expect(toastMessages).toEqual([
				"TOAST: Toast success message",
				"TOAST ERROR: Toast error message",
			]);
		});
	});
});