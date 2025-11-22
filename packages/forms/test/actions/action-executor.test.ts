import { test, expect, describe, beforeEach } from "bun:test";
import { ActionExecutor } from "@/actions/action-executor";
import { FormEngineBuilder } from "@/builder";
import type { FormEngine } from "@/engine/form-engine";
import type { BuilderActionRegistration } from "@/types";
import type { 
	ActionExecutionResult, 
} from "@/actions/types";
import { createMockContext, setupTestEnvironment } from "./__tools";
import type { FormActionTrigger } from "@/actions";
import { z } from "zod";

type TestActionConfig = {
	id: string;
	type: string;
	enabled: boolean;
	triggers?: FormActionTrigger[];
	[key: string]: any;
};

const mockContext = createMockContext();

const createMockAction = (
	type: string, 
	handler: (context: any) => Promise<ActionExecutionResult>,
	defaultTriggers: FormActionTrigger[] = []
): BuilderActionRegistration => {
	return {
		$type: type,
		schema: z.object({
			id: z.string(),
			type: z.literal(type),
			enabled: z.boolean().default(true),
			triggers: z.array(z.string()).optional(),
		}),
		metadata: {
			name: `${type} action`,
			defaultTriggers,
		},
		execute: handler,
	};
};

let executionOrder: string[] = [];

describe("ActionExecutor", () => {
	let executor: ActionExecutor;
	let engine: FormEngine;

	beforeEach(() => {
		setupTestEnvironment();
		executionOrder = [];
	});

	describe("Basic Trigger Execution", () => {
		test("should execute actions for matching trigger", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: `test executed for ${context.config.id}`,
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

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
			expect(executionOrder).toEqual(["test:action-1"]);
		});

		test("should skip actions that don't match trigger", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: "test executed",
					};
				},
				["form_mount"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

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
			expect(executionOrder).toEqual([]);
		});

		test("should skip disabled actions", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: "test executed",
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{
					type: "test_action",
					id: "action-1",
					enabled: false,
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(0);
			expect(executionOrder).toEqual([]);
		});

		test("should execute actions sequentially in order", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: "test executed",
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

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
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: "test executed",
					};
				},
				["form_mount"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{
					type: "test_action",
					id: "action-1",
					enabled: true,
					triggers: ["form_submit"],
				},
			];

			const results1 = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);
			expect(results1).toHaveLength(1);

			const results2 = await executor.executeTrigger(
				actions as any,
				"form_mount",
				mockContext
			);
			expect(results2).toHaveLength(0);
		});
	});

	describe("Error Handling", () => {
		test("should handle action execution failure", async () => {
			const failingAction = createMockAction(
				"failing_action",
				async (context) => {
					return {
						success: false,
						error: "Action failed",
						shouldContinue: true,
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(failingAction).build();
			executor = new ActionExecutor(engine);

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
			expect(results[0].error).toBe("Action failed");
		});

		test("should continue execution after failure by default", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					if (context.config.id === "fail") {
						return {
							success: false,
							error: "Action 1 failed",
							shouldContinue: true,
						};
					}
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: "test executed",
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "test_action", id: "fail", enabled: true },
				{ type: "test_action", id: "success", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(false);
			expect(results[1].success).toBe(true);
			expect(executionOrder).toContain("test:success");
		});

		test("should stop execution when shouldContinue is false", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					if (context.config.id === "stop") {
						return {
							success: false,
							error: "Stop execution",
							shouldContinue: false,
						};
					}
					executionOrder.push(`test:${context.config.id}`);
					return {
						success: true,
						message: "test executed",
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "test_action", id: "stop", enabled: true },
				{ type: "test_action", id: "next", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(executionOrder).not.toContain("test:next");
		});

		test("should handle handler throwing error", async () => {
			const throwingAction = createMockAction(
				"throwing_action",
				async (context) => {
					throw new Error("Handler threw error");
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(throwingAction).build();
			executor = new ActionExecutor(engine);

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
			expect(results[0].error).toContain("Handler threw error");
		});

		test("should handle unregistered action type", async () => {
			engine = new FormEngineBuilder().build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{
					type: "unregistered_action",
					id: "action-1",
					enabled: true,
					triggers: ["form_submit"],
				},
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain("No handler registered");
		});
	});

	describe("Submit Lifecycle Management", () => {
		test("should trigger submit lifecycle on successful submit", async () => {
			const submitAction = createMockAction(
				"submit",
				async (context) => {
					executionOrder.push("submit");
					return {
						success: true,
						message: "Form submitted",
					};
				},
				["form_submit"]
			);

			const successAction = createMockAction(
				"success_handler",
				async (context) => {
					executionOrder.push("success");
					return {
						success: true,
						message: "Success handler executed",
					};
				},
				["form_submit_success"]
			);

			const completeAction = createMockAction(
				"complete_handler",
				async (context) => {
					executionOrder.push("complete");
					return {
						success: true,
						message: "Complete handler executed",
					};
				},
				["form_submit_complete"]
			);

			engine = new FormEngineBuilder()
				.addAction(submitAction)
				.addAction(successAction)
				.addAction(completeAction)
				.build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "submit", id: "submit", enabled: true },
				{ type: "success_handler", id: "success", enabled: true },
				{ type: "complete_handler", id: "complete", enabled: true },
			];

			await executor.executeTrigger(actions as any, "form_submit", mockContext);

			expect(executionOrder).toContain("submit");
			expect(executionOrder).toContain("success");
			expect(executionOrder).toContain("complete");
		});

		test("should trigger error lifecycle on failed submit", async () => {
			const submitAction = createMockAction(
				"submit",
				async (context) => {
					executionOrder.push("submit");
					return {
						success: false,
						error: "Submit failed",
						shouldContinue: true,
					};
				},
				["form_submit"]
			);

			const errorAction = createMockAction(
				"error_handler",
				async (context) => {
					executionOrder.push("error");
					return {
						success: true,
						message: "Error handler executed",
					};
				},
				["form_submit_error"]
			);

			const completeAction = createMockAction(
				"complete_handler",
				async (context) => {
					executionOrder.push("complete");
					return {
						success: true,
						message: "Complete handler executed",
					};
				},
				["form_submit_complete"]
			);

			engine = new FormEngineBuilder()
				.addAction(submitAction)
				.addAction(errorAction)
				.addAction(completeAction)
				.build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "submit", id: "submit", enabled: true },
				{ type: "error_handler", id: "error", enabled: true },
				{ type: "complete_handler", id: "complete", enabled: true },
			];

			await executor.executeTrigger(actions as any, "form_submit", mockContext);

			expect(executionOrder).toContain("submit");
			expect(executionOrder).toContain("error");
			expect(executionOrder).toContain("complete");
		});
	});

	describe("Complex Scenarios", () => {
		test("should handle multiple actions with different triggers", async () => {
			const startAction = createMockAction(
				"start_action",
				async (context) => {
					executionOrder.push("start");
					return { success: true, message: "started" };
				},
				["form_mount"]
			);

			const submitAction = createMockAction(
				"submit_action",
				async (context) => {
					executionOrder.push("submit");
					return { success: true, message: "submitted" };
				},
				["form_submit"]
			);

			const changeAction = createMockAction(
				"change_action",
				async (context) => {
					executionOrder.push("change");
					return { success: true, message: "changed" };
				},
				["form_change"]
			);

			engine = new FormEngineBuilder()
				.addAction(startAction)
				.addAction(submitAction)
				.addAction(changeAction)
				.build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "start_action", id: "start", enabled: true },
				{ type: "submit_action", id: "submit", enabled: true },
				{ type: "change_action", id: "change", enabled: true },
			];

			await executor.executeTrigger(actions as any, "form_mount", mockContext);
			expect(executionOrder).toContain("start");

			executionOrder = [];
			await executor.executeTrigger(actions as any, "form_submit", mockContext);
			expect(executionOrder).toContain("submit");

			executionOrder = [];
			await executor.executeTrigger(actions as any, "form_change", mockContext);
			expect(executionOrder).toContain("change");
		});

		test("should handle mixed success and failure scenarios", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					if (context.config.id === "fail") {
						return {
							success: false,
							error: "Failed",
							shouldContinue: true,
						};
					}
					executionOrder.push(`success:${context.config.id}`);
					return {
						success: true,
						message: "executed",
					};
				},
				["form_submit"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "test_action", id: "success1", enabled: true },
				{ type: "test_action", id: "fail", enabled: true },
				{ type: "test_action", id: "success2", enabled: true },
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
				"success:success1",
				"success:success2"
			]);
		});

		test("should handle empty actions array", async () => {
			engine = new FormEngineBuilder().build();
			executor = new ActionExecutor(engine);

			const results = await executor.executeTrigger(
				[],
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(0);
		});

		test("should handle actions with no matching triggers", async () => {
			const testAction = createMockAction(
				"test_action",
				async (context) => {
					executionOrder.push("test");
					return { success: true, message: "executed" };
				},
				["form_mount"]
			);

			engine = new FormEngineBuilder().addAction(testAction).build();
			executor = new ActionExecutor(engine);

			const actions: TestActionConfig[] = [
				{ type: "test_action", id: "test", enabled: true },
			];

			const results = await executor.executeTrigger(
				actions as any,
				"form_submit",
				mockContext
			);

			expect(results).toHaveLength(0);
			expect(executionOrder).toHaveLength(0);
		});
	});

	describe("Cleanup", () => {
		test("should cleanup without errors", () => {
			engine = new FormEngineBuilder().build();
			executor = new ActionExecutor(engine);
			expect(() => executor.cleanup()).not.toThrow();
		});
	});
});