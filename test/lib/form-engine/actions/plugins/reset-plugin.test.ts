import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { actionRegistry } from "@/lib/form-engine/actions/action-registry";
import { resetPlugin, ResetActionSchema, type ResetAction } from "@/lib/form-engine/actions/plugins/reset-plugin";
import type { ActionExecutionContext } from "@/lib/form-engine/actions/types";
import { GDPRConsent } from "@/lib/form-engine/gdpr-consent";
import { createMockContext, setupTestEnvironment } from "../__tools";

describe("ResetPlugin", () => {
	let mockContext: ActionExecutionContext;

	beforeEach(() => {
		setupTestEnvironment();
		mockContext = createMockContext({
			formData: { name: "John", email: "john@example.com" },
		});
	});

	afterEach(() => {
		// Clean up mocks
		delete (global as any).window;
		actionRegistry.clear();
	});

	describe("Schema Validation", () => {
		test("should validate valid reset action", () => {
			const validAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
			};

			expect(() => ResetActionSchema.parse(validAction)).not.toThrow();
		});

		test("should validate reset action with all optional fields", () => {
			const validAction = {
				id: "test-reset",
				type: "reset",
				description: "Reset form to initial state",
				enabled: true,
				triggers: ["manual_reset", "submit_error"],
				confirmMessage: "Are you sure you want to reset?",
				resetToDefaults: false,
			};

			expect(() => ResetActionSchema.parse(validAction)).not.toThrow();
		});

		test("should reject invalid type", () => {
			const invalidAction = {
				id: "test-reset",
				type: "invalid",
				enabled: true,
			};

			expect(() => ResetActionSchema.parse(invalidAction)).toThrow();
		});

		test("should require ID", () => {
			const invalidAction = {
				type: "reset",
				enabled: true,
			};

			expect(() => ResetActionSchema.parse(invalidAction)).toThrow();
		});

		test("should default resetToDefaults to true", () => {
			const action = {
				id: "test-reset",
				type: "reset",
				enabled: true,
			};

			const parsed = ResetActionSchema.parse(action);
			expect(parsed.resetToDefaults).toBe(true);
		});

		test("should default enabled to true", () => {
			const action = {
				id: "test-reset",
				type: "reset",
			};

			const parsed = ResetActionSchema.parse(action);
			expect(parsed.enabled).toBe(true);
		});
	});

	describe("Plugin Factory", () => {
		test("should create plugin with default configuration", () => {
			const plugin = resetPlugin();

			expect(plugin.type).toBe("reset");
			expect(plugin.schema).toBe(ResetActionSchema);
			expect(plugin.defaultTriggers).toEqual(["manual_reset", "submit_success"]);
			expect(plugin.handler).toBeDefined();
		});

		test("should create plugin with custom configuration", () => {
			let resetCalled = false;
			let clearDraftCalled = false;
			let confirmCalled = false;
			let customResetCalled = false;

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmCalled = true;
					return true;
				},
				clearDraft: (formId) => {
					clearDraftCalled = true;
				},
				resetForm: (context, resetToDefaults) => {
					customResetCalled = true;
				},
				onReset: (context) => {
					resetCalled = true;
				},
			});

			expect(plugin.type).toBe("reset");
			expect(plugin.handler).toBeDefined();
		});
	});

	describe("Action Execution", () => {
		test("should execute successful reset action", async () => {
			let formResetCalled = false;
			
			mockContext.form.reset = () => {
				formResetCalled = true;
			};

			const plugin = resetPlugin();
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Form reset successfully");
			expect(result.shouldContinue).toBe(true);
			expect(formResetCalled).toBe(true);
		});

		test("should reset with resetToDefaults=true", async () => {
			let resetParams: any[] = [];
			
			mockContext.form.reset = (...args: any[]) => {
				resetParams = args;
			};

			const plugin = resetPlugin();
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			await actionRegistry.execute(action, mockContext);

			// When resetToDefaults is true, reset() is called without parameters
			expect(resetParams).toEqual([]);
		});

		test("should reset with resetToDefaults=false", async () => {
			let resetParams: any[] = [];
			
			mockContext.form.reset = (...args: any[]) => {
				resetParams = args;
			};

			const plugin = resetPlugin();
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: false,
			};

			await actionRegistry.execute(action, mockContext);

			// When resetToDefaults is false, reset({}) is called with empty object
			expect(resetParams).toEqual([{}]);
		});

		test("should call custom reset handler", async () => {
			let customResetContext: ActionExecutionContext | null = null;
			let customResetToDefaults: boolean | null = null;

			const plugin = resetPlugin({
				resetForm: (context, resetToDefaults) => {
					customResetContext = context;
					customResetToDefaults = resetToDefaults;
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: false,
			};

			await actionRegistry.execute(action, mockContext);

			expect(customResetContext).toBeTruthy();
			expect(customResetToDefaults).not.toBeNull();
			expect(customResetToDefaults!).toBe(false);
		});

		test("should call onReset callback", async () => {
			let onResetContext: ActionExecutionContext | null = null;

			const plugin = resetPlugin({
				onReset: (context) => {
					onResetContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			await actionRegistry.execute(action, mockContext);

			expect(onResetContext).toBeTruthy();
		});

		test("should call clearDraft", async () => {
			let clearDraftFormId: string | null = null;

			const plugin = resetPlugin({
				clearDraft: (formId) => {
					clearDraftFormId = formId;
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			await actionRegistry.execute(action, mockContext);

			expect(clearDraftFormId).not.toBeNull();
			expect(clearDraftFormId!).toBe("test-form");
		});

		test("should handle confirmation dialog - confirmed", async () => {
			let confirmMessage: string | null = null;

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmMessage = message;
					return true;
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Are you sure?",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(confirmMessage).not.toBeNull();
			expect(confirmMessage!).toBe("Are you sure?");
		});

		test("should handle confirmation dialog - cancelled", async () => {
			let confirmCalled = false;

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmCalled = true;
					return false;
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Are you sure?",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Reset cancelled by user");
			expect(result.shouldContinue).toBe(true);
			expect(confirmCalled).toBe(true);
		});

		test("should handle async confirmation dialog", async () => {
			let confirmMessage: string | null = null;

			const plugin = resetPlugin({
				confirm: async (message) => {
					confirmMessage = message;
					return new Promise((resolve) => {
						setTimeout(() => resolve(true), 10);
					});
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Async confirm?",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(confirmMessage).not.toBeNull();
			expect(confirmMessage!).toBe("Async confirm?");
		});

		test("should not show confirmation without confirmMessage", async () => {
			let confirmCalled = false;

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmCalled = true;
					return true;
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(confirmCalled).toBe(false);
		});

		test("should handle errors in custom handlers", async () => {
			const plugin = resetPlugin({
				resetForm: () => {
					throw new Error("Custom reset failed");
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Custom reset failed");
			expect(result.shouldContinue).toBe(true);
		});

		test("should handle non-Error exceptions", async () => {
			const plugin = resetPlugin({
				resetForm: () => {
					throw "String error";
				},
			});
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Reset failed");
			expect(result.shouldContinue).toBe(true);
		});
	});

	describe("Integration", () => {
		test("should register plugin and execute successfully", async () => {
			const plugin = resetPlugin({
				onReset: (context) => {
					// Track reset event
				},
			});
			
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: undefined,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Form reset successfully");
		});

		test("should work with default window.confirm", async () => {
			(global as any).window = { confirm: () => true };

			const plugin = resetPlugin(); // Uses default confirm
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Reset form?",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
		});

		test("should work with GDPR consent checking", async () => {
			let gdprConsentChecked = false;
			let draftCleared = false;

			(GDPRConsent as any).hasConsent = () => {
				gdprConsentChecked = true;
				return true;
			};

			(GDPRConsent as any).clearDraft = () => {
				draftCleared = true;
			};

			const plugin = resetPlugin(); // Uses default clearDraft
			actionRegistry.register(plugin);

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			await actionRegistry.execute(action, mockContext);

			expect(gdprConsentChecked).toBe(true);
			expect(draftCleared).toBe(true);
		});
	});
});