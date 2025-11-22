import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { FormEngineBuilder } from "@/builder";
import { ActionExecutor } from "@/actions/action-executor";
import type { FormEngine } from "@/engine/form-engine";
import type { BuilderActionExecutionContext } from "@/types";
import { resetPlugin, ResetActionSchema, type ResetAction } from "@/actions/plugins/reset-plugin";
import { GDPRConsent } from "@/tools/gdpr-consent";
import { createMockBuilderContext, setupTestEnvironment } from "../__tools";

describe("ResetPlugin", () => {
	let engine: FormEngine;
	let executor: ActionExecutor;

	beforeEach(() => {
		setupTestEnvironment();
	});

	afterEach(() => {
		delete (global as any).window;
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
				triggers: ["form_submit_error"],
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

		expect(plugin.$type).toBe("reset");
		expect(plugin.schema).toBe(ResetActionSchema);
		expect(plugin.metadata.defaultTriggers).toEqual(["form_submit_success"]);
		expect(plugin.execute).toBeDefined();
	});		test("should create plugin with custom configuration", () => {
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

			expect(plugin.$type).toBe("reset");
			expect(plugin.execute).toBeDefined();
		});
	});

	describe("Action Execution", () => {
		test("should execute successful reset action", async () => {
			let formResetCalled = false;

			const plugin = resetPlugin({
				resetForm: (context, resetToDefaults) => {
					formResetCalled = true;
					context.form.reset();
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Form reset successfully");
			expect(result.shouldContinue).toBe(true);
			expect(formResetCalled).toBe(true);
		});

		test("should reset with resetToDefaults=true", async () => {
			let resetParams: any[] = [];

			const plugin = resetPlugin({
				resetForm: (context, resetToDefaults) => {
					context.form.reset();
					resetParams = resetToDefaults ? [] : [{}];
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(resetParams).toEqual([]);
		});

		test("should reset with resetToDefaults=false", async () => {
			let resetParams: any[] = [];

			const plugin = resetPlugin({
				resetForm: (context, resetToDefaults) => {
					context.form.reset();
					resetParams = resetToDefaults ? [] : [{}];
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: false,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(resetParams).toEqual([{}]);
		});

		test("should call custom reset handler", async () => {
			let customResetContext: BuilderActionExecutionContext<ResetAction> | undefined = undefined;
			let customResetToDefaults = true;

			const plugin = resetPlugin({
				resetForm: (context, resetToDefaults) => {
					customResetContext = context;
					customResetToDefaults = resetToDefaults;
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: false,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(customResetContext).toBeTruthy();
			expect(customResetToDefaults).toBe(false);
		});

		test("should call onReset callback", async () => {
			let onResetContext: BuilderActionExecutionContext<ResetAction> | undefined = undefined;

			const plugin = resetPlugin({
				onReset: (context) => {
					onResetContext = context;
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(onResetContext).toBeTruthy();
		});

		test("should call clearDraft", async () => {
			let clearDraftFormId = "";

			const plugin = resetPlugin({
				clearDraft: (formId) => {
					clearDraftFormId = formId;
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(clearDraftFormId).toBe("test-form");
		});

		test("should handle confirmation dialog - confirmed", async () => {
			let confirmMessage = "";

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmMessage = message;
					return true;
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Are you sure?",
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(confirmMessage).toBe("Are you sure?");
		});

		test("should handle confirmation dialog - cancelled", async () => {
			let confirmCalled = false;

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmCalled = true;
					return false;
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Are you sure?",
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Reset cancelled by user");
			expect(result.shouldContinue).toBe(true);
			expect(confirmCalled).toBe(true);
		});

		test("should handle async confirmation dialog", async () => {
			let confirmMessage = "";

			const plugin = resetPlugin({
				confirm: async (message) => {
					confirmMessage = message;
					return new Promise((resolve) => {
						setTimeout(() => resolve(true), 10);
					});
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Async confirm?",
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(confirmMessage).toBe("Async confirm?");
		});

		test("should not show confirmation without confirmMessage", async () => {
			let confirmCalled = false;

			const plugin = resetPlugin({
				confirm: (message) => {
					confirmCalled = true;
					return true;
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(confirmCalled).toBe(false);
		});

		test("should handle errors in custom handlers", async () => {
			const plugin = resetPlugin({
				resetForm: () => {
					throw new Error("Custom reset failed");
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

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

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Reset failed");
			expect(result.shouldContinue).toBe(true);
		});
	});

	describe("Integration", () => {
		test("should execute successfully with plugin", async () => {
			const plugin = resetPlugin({
				onReset: (context) => {
				},
			});

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: undefined,
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Form reset successfully");
		});

		test("should work with default window.confirm", async () => {
			(global as any).window = { confirm: () => true };

			const plugin = resetPlugin();

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
				confirmMessage: "Reset form?",
			};

			const context = createMockBuilderContext(action);

			const result = await plugin.execute(context);

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

			const plugin = resetPlugin();

			const action: ResetAction = {
				id: "test-reset",
				type: "reset",
				enabled: true,
				resetToDefaults: true,
			};

			const context = createMockBuilderContext(action);

			await plugin.execute(context);

			expect(gdprConsentChecked).toBe(true);
			expect(draftCleared).toBe(true);
		});
	});
});