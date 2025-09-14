import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { ActionExecutor } from "@/actions/action-executor";
import { actionRegistry, registerAction } from "@/actions/action-registry";
import type { 
	ActionExecutionContext, 
	ActionExecutionResult, 
	ActionTrigger 
} from "@/actions/types";
import { createMockContext, setupTestEnvironment } from "./__tools";

type TestActionConfig = {
	id: string;
	type: string;
	enabled: boolean;
	triggers?: ActionTrigger[];
	[key: string]: any;
};

const mockContext = createMockContext();

const createMockHandler = (name: string, shouldFail = false, delay = 0) => {
	return async (action: any, context: ActionExecutionContext): Promise<ActionExecutionResult> => {
		if (delay > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
		
		if (shouldFail) {
			return {
				success: false,
				error: `${name} action failed`,
				shouldContinue: true,
			};
		}

		return {
			success: true,
			message: `${name} executed for ${action.id}`,
		};
	};
};

const createSubmitHandler = (shouldFail = false) => {
	return async (action: any, context: ActionExecutionContext): Promise<ActionExecutionResult> => {
		if (shouldFail) {
			return {
				success: false,
				error: "Submit failed",
				shouldContinue: false,
			};
		}

		return {
			success: true,
			message: "Form submitted successfully",
		};
	};
};

let executionOrder: string[] = [];

const createTrackingHandler = (name: string) => {
	return async (action: any, context: ActionExecutionContext): Promise<ActionExecutionResult> => {
		executionOrder.push(`${name}:${action.id}`);
		return {
			success: true,
			message: `${name} tracked`,
		};
	};
};

describe("ActionExecutor", () => {
	let executor: ActionExecutor;

	beforeEach(() => {
		setupTestEnvironment();
		executor = new ActionExecutor();
		executionOrder = [];
	});

	afterEach(() => {
		executor.cleanup();
		actionRegistry.clear();
		executionOrder = [];
	});

	describe("Basic Trigger Execution", () => {
		test("should execute actions for matching trigger", async () => {
			registerAction({
				type: "test_action",
				handler: createMockHandler("test"),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{
					type: "test_action",
					id: "action-1",
					enabled: true,
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(results[0].message).toBe("test executed for action-1");
		});

		test("should skip actions that don't match trigger", async () => {
			registerAction({
				type: "test_action",
				handler: createMockHandler("test"),
				defaultTriggers: ["form_start"],
			});

			const actions: TestActionConfig[] = [
				{
					type: "test_action",
					id: "action-1",
					enabled: true,
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit", 
				mockContext
			);

			expect(results).toHaveLength(0);
		});

		test("should skip disabled actions", async () => {
			registerAction({
				type: "test_action",
				handler: createMockHandler("test"),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{
					type: "test_action",
					id: "action-1",
					enabled: false, // Disabled
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(0);
		});

		test("should execute actions sequentially in order", async () => {
			registerAction({
				type: "test_action",
				handler: createTrackingHandler("test"),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{ type: "test_action", id: "first", enabled: true },
				{ type: "test_action", id: "second", enabled: true },
				{ type: "test_action", id: "third", enabled: true },
			];

			await executor.executeTrigger(actions as any, "form_submit", mockContext);

			expect(executionOrder).toEqual([
				"test:first",
				"test:second", 
				"test:third"
			]);
		});
	});

	describe("Custom Triggers", () => {
		test("should respect custom triggers on actions", async () => {
			registerAction({
				type: "test_action",
				handler: createMockHandler("test"),
				defaultTriggers: ["form_start"], // Default trigger
			});

			const actions: TestActionConfig[] = [
				{
					type: "test_action",
					id: "action-1",
					enabled: true,
					triggers: ["form_submit"], // Custom override
				},
			];

			// Should execute with custom trigger
			const results1 = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);
			expect(results1).toHaveLength(1);

			// Should NOT execute with default trigger
			const results2 = await executor.executeTrigger(
				actions as any,
				"form_start",
				mockContext
			);
			expect(results2).toHaveLength(0);
		});
	});

	describe("Error Handling", () => {
		test("should handle action execution failure", async () => {
			registerAction({
				type: "failing_action",
				handler: createMockHandler("failing", true),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{
					type: "failing_action",
					id: "action-1",
					enabled: true,
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe("failing action failed");
		});

		test("should continue execution after failure by default", async () => {
			registerAction({
				type: "failing_action",
				handler: createMockHandler("failing", true),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "success_action",
				handler: createTrackingHandler("success"),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{ type: "failing_action", id: "fail", enabled: true },
				{ type: "success_action", id: "success", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(false);
			expect(results[1].success).toBe(true);
			expect(executionOrder).toContain("success:success");
		});

		test("should stop execution when shouldContinue is false", async () => {
			registerAction({
				type: "stopping_action",
				handler: async () => ({
					success: false,
					error: "Stop execution",
					shouldContinue: false,
				}),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "next_action",
				handler: createTrackingHandler("next"),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{ type: "stopping_action", id: "stop", enabled: true },
				{ type: "next_action", id: "next", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(executionOrder).not.toContain("next:next");
		});

		test("should handle handler throwing error", async () => {
			registerAction({
				type: "throwing_action",
				handler: async () => {
					throw new Error("Handler threw error");
				},
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{
					type: "throwing_action",
					id: "action-1",
					enabled: true,
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe("Action execution failed: Handler threw error");
		});

		test("should handle unregistered action type", async () => {
			const actions: TestActionConfig[] = [
				{
					type: "unregistered_action",
					id: "action-1",
					enabled: true,
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(0); 
		});
	});

	describe("Submit Lifecycle Management", () => {
		test("should trigger submit lifecycle on successful submit", async () => {
			registerAction({
				type: "submit",
				handler: createSubmitHandler(false),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "success_handler",
				handler: createTrackingHandler("success"),
				defaultTriggers: ["submit_success"],
			});

			registerAction({
				type: "complete_handler",
				handler: createTrackingHandler("complete"),
				defaultTriggers: ["submit_complete"],
			});

			const actions: TestActionConfig[] = [
				{ type: "submit", id: "submit", enabled: true, endpoint: "/api/test", method: "POST" },
				{ type: "success_handler", id: "success", enabled: true },
				{ type: "complete_handler", id: "complete", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(3);
			expect(results[0].success).toBe(true); 
			expect(results[1].success).toBe(true); 
			expect(results[2].success).toBe(true); 

			expect(executionOrder).toContain("success:success");
			expect(executionOrder).toContain("complete:complete");
		});

		test("should trigger error lifecycle on failed submit", async () => {
			registerAction({
				type: "submit",
				handler: createSubmitHandler(true),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "error_handler",
				handler: createTrackingHandler("error"),
				defaultTriggers: ["submit_error"],
			});

			registerAction({
				type: "complete_handler",
				handler: createTrackingHandler("complete"),
				defaultTriggers: ["submit_complete"],
			});

			const actions: TestActionConfig[] = [
				{ type: "submit", id: "submit", enabled: true, endpoint: "/api/test", method: "POST" },
				{ type: "error_handler", id: "error", enabled: true },
				{ type: "complete_handler", id: "complete", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(3);
			expect(results[0].success).toBe(false); 
			expect(results[1].success).toBe(true); 
			expect(results[2].success).toBe(true);

			expect(executionOrder).toContain("error:error");
			expect(executionOrder).toContain("complete:complete");
		});

		test("should update form state during submit lifecycle", async () => {
			let capturedContext: ActionExecutionContext | null = null;

			registerAction({
				type: "submit",
				handler: createSubmitHandler(false),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "success_handler",
				handler: async (action, context) => {
					capturedContext = context;
					return { success: true };
				},
				defaultTriggers: ["submit_success"],
			});

			const actions: TestActionConfig[] = [
				{ type: "submit", id: "submit", enabled: true, endpoint: "/api/test", method: "POST" },
				{ type: "success_handler", id: "success", enabled: true },
			];

			await executor.executeTrigger(actions as any, "form_submit", mockContext);

			expect(capturedContext).not.toBeNull();
			if (capturedContext) {
				const context = capturedContext as ActionExecutionContext;
				expect(context.form.formState.isSubmitting).toBe(false);
				expect(context.form.formState.isSubmitSuccessful).toBe(true);
			}
		});
	});

	describe("Complex Scenarios", () => {
		test("should handle multiple actions with different triggers", async () => {
			registerAction({
				type: "start_action",
				handler: createTrackingHandler("start"),
				defaultTriggers: ["form_start"],
			});

			registerAction({
				type: "submit_action", 
				handler: createTrackingHandler("submit"),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "change_action",
				handler: createTrackingHandler("change"),
				defaultTriggers: ["form_change"],
			});

			const actions: TestActionConfig[] = [
				{ type: "start_action", id: "start", enabled: true },
				{ type: "submit_action", id: "submit", enabled: true },
				{ type: "change_action", id: "change", enabled: true },
			];

			// Test form_start trigger
			await executor.executeTrigger(actions as any, "form_start", mockContext);
			expect(executionOrder).toContain("start:start");

			// Test form_submit trigger  
			executionOrder = [];
			await executor.executeTrigger(actions as any, "form_submit", mockContext);
			expect(executionOrder).toContain("submit:submit");

			// Test form_change trigger
			executionOrder = [];
			await executor.executeTrigger(actions as any, "form_change", mockContext);
			expect(executionOrder).toContain("change:change");
		});

		test("should handle mixed success and failure scenarios", async () => {
			registerAction({
				type: "success_action",
				handler: createTrackingHandler("success"),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "fail_action",
				handler: createMockHandler("fail", true),
				defaultTriggers: ["form_submit"],
			});

			registerAction({
				type: "final_action",
				handler: createTrackingHandler("final"),
				defaultTriggers: ["form_submit"],
			});

			const actions: TestActionConfig[] = [
				{ type: "success_action", id: "success", enabled: true },
				{ type: "fail_action", id: "fail", enabled: true },
				{ type: "final_action", id: "final", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(3);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(false);
			expect(results[2].success).toBe(true);

			expect(executionOrder).toEqual([
				"success:success",
				"final:final"
			]);
		});

		test("should handle empty actions array", async () => {
			const results = await executor.executeTrigger(
				[],
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(0);
		});

		test("should handle actions with no matching triggers", async () => {
			registerAction({
				type: "test_action",
				handler: createTrackingHandler("test"),
				defaultTriggers: ["form_start"],
			});

			const actions: TestActionConfig[] = [
				{ type: "test_action", id: "test", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit", // No matching trigger
				mockContext
			);

			expect(results).toHaveLength(0);
			expect(executionOrder).toHaveLength(0);
		});
	});

	describe("Cleanup", () => {
		test("should cleanup without errors", () => {
			expect(() => executor.cleanup()).not.toThrow();
		});
	});
});