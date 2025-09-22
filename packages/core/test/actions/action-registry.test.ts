import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { z } from "zod";
import { actionRegistry, registerAction}  from "@/actions/action-registry";
import { createMockContext, setupTestEnvironment } from "./__tools";
import type {  ActionHandler, RegisteredAction } from "@/actions/types";
import type { ActionTrigger } from "@/actions/triggers";

const mockActionHandler: ActionHandler = async (action, context) => ({
	success: true,
	message: `Executed ${action.type} with id: ${action.id}`,
});

const mockFailingActionHandler: ActionHandler = async (action, context) => ({
	success: false,
	error: "Mock action failed",
});

const mockThrowingActionHandler: ActionHandler = async (action, context) => {
	throw new Error("Mock handler threw error");
};

const TestActionSchema = z.object({
	type: z.literal("test_action"),
	id: z.string(),
	testField: z.string(),
	optionalField: z.string().optional(),
});

const mockContext = createMockContext();

describe("ActionRegistry", () => {
	beforeEach(() => {
		setupTestEnvironment();
	});

	afterEach(() => {
		actionRegistry.clear();
	});

	describe("Action Registration", () => {
		test("should register a basic action", () => {
			const actionDef: RegisteredAction = {
				type: "test_action",
				handler: mockActionHandler,
			};

			actionRegistry.register(actionDef);

			expect(actionRegistry.has("test_action")).toBe(true);
			expect(actionRegistry.get("test_action")).toEqual(actionDef);
		});

		test("should register action with schema and default triggers", () => {
			const actionDef: RegisteredAction = {
				type: "complex_action",
				handler: mockActionHandler,
				schema: TestActionSchema,
				defaultTriggers: ["form_submit", "step_change"] as readonly ActionTrigger[],
			};

			actionRegistry.register(actionDef);

			const registered = actionRegistry.get("complex_action");
			expect(registered).toEqual(actionDef);
			expect(registered?.schema).toBe(TestActionSchema);
			expect(registered?.defaultTriggers).toEqual(["form_submit", "step_change"]);
		});

		test("should override existing action with warning", () => {
			const firstAction: RegisteredAction = {
				type: "duplicate_action",
				handler: mockActionHandler,
			};

			const secondAction: RegisteredAction = {
				type: "duplicate_action",
				handler: mockFailingActionHandler,
			};

			actionRegistry.register(firstAction);
			actionRegistry.register(secondAction);

			expect(actionRegistry.get("duplicate_action")?.handler).toBe(mockFailingActionHandler);
		});

		test("should register using helper function", () => {
			registerAction({
				type: "helper_action",
				handler: mockActionHandler,
				defaultTriggers: ["form_start"] as readonly ActionTrigger[],
			});

			expect(actionRegistry.has("helper_action")).toBe(true);
			expect(actionRegistry.getDefaultTriggers("helper_action")).toEqual(["form_start"]);
		});
	});

	describe("Action Retrieval", () => {
		test("should check if action exists", () => {
			actionRegistry.register({
				type: "exists_action",
				handler: mockActionHandler,
			});

			expect(actionRegistry.has("exists_action")).toBe(true);
			expect(actionRegistry.has("non_existent")).toBe(false);
		});

		test("should get registered action", () => {
			const actionDef: RegisteredAction = {
				type: "get_action",
				handler: mockActionHandler,
			};

			actionRegistry.register(actionDef);

			expect(actionRegistry.get("get_action")).toEqual(actionDef);
			expect(actionRegistry.get("non_existent")).toBeUndefined();
		});

		test("should get default triggers", () => {
			const triggers: readonly ActionTrigger[] = ["form_submit", "submit_success"];
			
			actionRegistry.register({
				type: "trigger_action",
				handler: mockActionHandler,
				defaultTriggers: triggers,
			});

			expect(actionRegistry.getDefaultTriggers("trigger_action")).toEqual(triggers);
			expect(actionRegistry.getDefaultTriggers("non_existent")).toBeUndefined();
		});

		test("should get all registered types", () => {
			actionRegistry.register({ type: "action1", handler: mockActionHandler });
			actionRegistry.register({ type: "action2", handler: mockActionHandler });
			actionRegistry.register({ type: "action3", handler: mockActionHandler });

			const types = actionRegistry.getRegisteredTypes();
			expect(types).toHaveLength(3);
			expect(types).toContain("action1");
			expect(types).toContain("action2");
			expect(types).toContain("action3");
		});
	});

	describe("Action Execution", () => {
		test("should execute registered action successfully", async () => {
			actionRegistry.register({
				type: "success_action",
				handler: mockActionHandler,
			});

			const action = { type: "success_action", id: "test-1" };
			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Executed success_action with id: test-1");
		});

		test("should handle action execution failure", async () => {
			actionRegistry.register({
				type: "fail_action",
				handler: mockFailingActionHandler,
			});

			const action = { type: "fail_action", id: "test-1" };
			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Mock action failed");
		});

		test("should handle unregistered action type", async () => {
			const action = { type: "unregistered", id: "test-1" };
			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("No handler registered for action type: unregistered");
		});

		test("should handle handler throwing error", async () => {
			actionRegistry.register({
				type: "throwing_action",
				handler: mockThrowingActionHandler,
			});

			const action = { type: "throwing_action", id: "test-1" };
			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Action execution failed: Mock handler threw error");
		});
	});

	describe("Schema Validation", () => {
		beforeEach(() => {
			actionRegistry.register({
				type: "test_action",
				handler: mockActionHandler,
				schema: TestActionSchema,
			});
		});

		test("should validate action config with schema", async () => {
			const validAction = {
				type: "test_action",
				id: "test-1",
				testField: "required value",
				optionalField: "optional value",
			};

			const result = await actionRegistry.execute(validAction, mockContext);
			expect(result.success).toBe(true);
		});

		test("should reject invalid action config", async () => {
			const invalidAction = {
				type: "test_action",
				id: "test-1",
				// Missing required testField
			};

			const result = await actionRegistry.execute(invalidAction, mockContext);
			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid action config");
		});

		test("should handle schema validation error", async () => {
			const invalidAction = {
				type: "test_action",
				id: 123, // Should be string
				testField: "value",
			};

			const result = await actionRegistry.execute(invalidAction, mockContext);
			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid action config");
		});

		test("should execute without schema validation when no schema provided", async () => {
			actionRegistry.register({
				type: "no_schema_action",
				handler: mockActionHandler,
			});

			const action = {
				type: "no_schema_action",
				id: "test-1",
				anyProperty: "any value",
			};

			const result = await actionRegistry.execute(action, mockContext);
			expect(result.success).toBe(true);
		});
	});

	describe("Registry Management", () => {
		test("should clear all registered actions", () => {
			actionRegistry.register({ type: "action1", handler: mockActionHandler });
			actionRegistry.register({ type: "action2", handler: mockActionHandler });

			expect(actionRegistry.getRegisteredTypes()).toHaveLength(2);

			actionRegistry.clear();

			expect(actionRegistry.getRegisteredTypes()).toHaveLength(0);
			expect(actionRegistry.has("action1")).toBe(false);
			expect(actionRegistry.has("action2")).toBe(false);
		});
	});

	describe("Complex Action Scenarios", () => {
		test("should handle action with custom execution logic", async () => {
			const customHandler: ActionHandler = async (action, context) => {
				if (context.formId === "special-form") {
					return { success: true, message: "Special handling" };
				}
				return { success: false, error: "Not a special form" };
			};

			actionRegistry.register({
				type: "custom_action",
				handler: customHandler,
			});

			// Test with special form
			const specialContext = { ...mockContext, formId: "special-form" };
			const specialResult = await actionRegistry.execute(
				{ type: "custom_action", id: "test-1" },
				specialContext
			);
			expect(specialResult.success).toBe(true);
			expect(specialResult.message).toBe("Special handling");

			// Test with regular form
			const regularResult = await actionRegistry.execute(
				{ type: "custom_action", id: "test-1" },
				mockContext
			);
			expect(regularResult.success).toBe(false);
			expect(regularResult.error).toBe("Not a special form");
		});

		test("should handle async action handlers", async () => {
			const asyncHandler: ActionHandler = async (action, context) => {
				await new Promise(resolve => setTimeout(resolve, 10));
				return { success: true, message: "Async completed" };
			};

			actionRegistry.register({
				type: "async_action",
				handler: asyncHandler,
			});

			const result = await actionRegistry.execute(
				{ type: "async_action", id: "test-1" },
				mockContext
			);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Async completed");
		});

		test("should handle synchronous action handlers", async () => {
			const syncHandler: ActionHandler = (action, context) => ({
				success: true,
				message: "Sync completed",
			});

			actionRegistry.register({
				type: "sync_action",
				handler: syncHandler,
			});

			const result = await actionRegistry.execute(
				{ type: "sync_action", id: "test-1" },
				mockContext
			);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Sync completed");
		});
	});
});