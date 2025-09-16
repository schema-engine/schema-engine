import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { actionRegistry, registerAction } from "@/actions/action-registry";
import { GTMEventActionSchema, type GTMEventAction } from "@/actions/plugins/gtm-plugin";
import { GTMTracker } from "@/tools/gtm-tracker";
import type { ActionExecutionContext, ActionExecutionResult } from "@/actions/types";
import { createMockContext, setupTestEnvironment } from "../__tools";

type GTMEventActionInput = {
	id: string;
	type: "gtm_event";
	enabled?: boolean;
	eventName: string;
	description?: string;
	eventData?: Record<string, any>;
	includeFormData?: boolean | string[];
	triggers?: ("form_start" | "form_change" | "form_submit" | "step_change" | "step_submit" | "step_enter" | "step_leave" | "step_view" | "manual_save" | "manual_reset")[];
};

interface GTMEvent {
	event: string;
	timestamp: string;
	[key: string]: any;
}

const mockDataLayer: GTMEvent[] = [];

const originalGTMTracker = { ...GTMTracker };

describe("GTMPlugin", () => {
	let mockContext: ActionExecutionContext;
	let originalWindow: any;

	beforeEach(() => {
		setupTestEnvironment();
		mockContext = createMockContext({
			formData: {
				name: "John",
				email: "john@example.com",
				userType: "premium",
			},
			currentStep: 2,
			totalSteps: 3,
			metadata: {
				stepStartTime: Date.now(),
				totalFormTime: 5000,
				userInteractions: 10,
			},
		});

		originalWindow = globalThis.window;
		globalThis.window = {
			dataLayer: mockDataLayer,
		} as any;

		// Clear mock data
		mockDataLayer.length = 0;

		// Mock GTMTracker methods
		GTMTracker.push = (event: string, data: Record<string, any> = {}) => {
			mockDataLayer.push({
				event,
				...data,
				timestamp: new Date().toISOString(),
			});
		};

		GTMTracker.isAvailable = () => true;

		// Register the GTM plugin since it gets cleared in afterEach
		registerAction({
			type: "gtm_event",
			schema: GTMEventActionSchema,
			defaultTriggers: ["form_start", "form_submit", "step_change", "step_submit"],
			handler: async (
				action: GTMEventAction,
				context: ActionExecutionContext
			): Promise<ActionExecutionResult> => {
				try {
					const eventData: Record<string, any> = {
						...action.eventData,
						form_id: context.formId,
						current_step: context.currentStep,
						total_steps: context.totalSteps,
						is_valid: context.isValid,
						...context.metadata,
					};

					// Handle form data inclusion
					if (action.includeFormData === true) {
						eventData.form_data = context.formData;
					} else if (Array.isArray(action.includeFormData)) {
						const selectedData: Record<string, any> = {};
						for (const fieldName of action.includeFormData) {
							if (fieldName in context.formData) {
								selectedData[fieldName] = context.formData[fieldName];
							}
						}
						eventData.form_data = selectedData;
					}

					GTMTracker.push(action.eventName, eventData);

					return {
						success: true,
						message: `GTM event '${action.eventName}' pushed successfully`,
						shouldContinue: true,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "GTM event push failed",
						shouldContinue: true,
					};
				}
			},
		});
	});

	afterEach(() => {
		actionRegistry.clear();
		mockDataLayer.length = 0;
		globalThis.window = originalWindow;
		
		Object.assign(GTMTracker, originalGTMTracker);
	});

	describe("Schema Validation", () => {
		test("should validate valid GTM event action", () => {
			const validAction = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
			};

			expect(() => GTMEventActionSchema.parse(validAction)).not.toThrow();
		});

		test("should validate GTM action with all optional fields", () => {
			const fullAction = {
				id: "test-gtm",
				type: "gtm_event",
				description: "Track form submission",
				enabled: true,
				eventName: "form_submit",
				eventData: {
					category: "engagement",
					source: "newsletter",
				},
				includeFormData: ["email", "userType"],
				triggers: ["form_submit", "step_submit"],
			};

			expect(() => GTMEventActionSchema.parse(fullAction)).not.toThrow();
		});

		test("should reject empty event name", () => {
			const invalidAction = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "",
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow("Event name cannot be empty");
		});

		test("should reject invalid type", () => {
			const invalidAction = {
				id: "test-gtm",
				type: "invalid_type",
				enabled: true,
				eventName: "form_start",
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow();
		});

		test("should default includeFormData to false", () => {
			const action = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.includeFormData).toBe(false);
		});

		test("should default eventData to empty object", () => {
			const action = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.eventData).toEqual({});
		});

		test("should accept boolean includeFormData", () => {
			const action = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
				includeFormData: true,
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.includeFormData).toBe(true);
		});

		test("should accept array includeFormData", () => {
			const action = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
				includeFormData: ["name", "email"],
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.includeFormData).toEqual(["name", "email"]);
		});

		test("should reject empty field names in includeFormData array", () => {
			const invalidAction = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
				includeFormData: ["name", ""],
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow("Field name cannot be empty");
		});

		test("should validate trigger enum values", () => {
			const validAction = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
				triggers: ["form_start", "step_change", "manual_save"],
			};

			expect(() => GTMEventActionSchema.parse(validAction)).not.toThrow();
		});

		test("should reject invalid trigger values", () => {
			const invalidAction = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
				triggers: ["invalid_trigger"],
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow();
		});
	});

	describe("Action Execution", () => {
		test("should execute basic GTM event", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toBe("GTM event 'form_start' pushed successfully");
			expect(result.shouldContinue).toBe(true);

			expect(mockDataLayer).toHaveLength(1);
			expect(mockDataLayer[0].event).toBe("form_start");
			expect(mockDataLayer[0].form_id).toBe("test-form");
			expect(mockDataLayer[0].current_step).toBe(2);
			expect(mockDataLayer[0].total_steps).toBe(3);
		});

		test("should include static event data", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_submit",
				eventData: {
					category: "engagement",
					source: "newsletter",
					value: 100,
				},
			};

			await actionRegistry.execute(action, mockContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.category).toBe("engagement");
			expect(pushedEvent.source).toBe("newsletter");
			expect(pushedEvent.value).toBe(100);
		});

		test("should include all form data when includeFormData is true", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_submit",
				includeFormData: true,
			};

			await actionRegistry.execute(action, mockContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toEqual({
				name: "John",
				email: "john@example.com",
				userType: "premium",
			});
		});

		test("should include specific form fields when includeFormData is array", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_submit",
				includeFormData: ["email", "userType"],
			};

			await actionRegistry.execute(action, mockContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toEqual({
				email: "john@example.com",
				userType: "premium",
			});
		});

		test("should exclude non-existent fields from specific inclusion", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_submit",
				includeFormData: ["email", "nonExistentField", "userType"],
			};

			await actionRegistry.execute(action, mockContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toEqual({
				email: "john@example.com",
				userType: "premium",
			});
		});

		test("should not include form data when includeFormData is false", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
				includeFormData: false,
			};

			await actionRegistry.execute(action, mockContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toBeUndefined();
		});

		test("should include context metadata", async () => {
			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "step_change",
			};

			await actionRegistry.execute(action, mockContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.stepStartTime).toBe(mockContext.metadata.stepStartTime);
			expect(pushedEvent.totalFormTime).toBe(5000);
			expect(pushedEvent.userInteractions).toBe(10);
		});

		test("should include form validation state", async () => {
			const invalidContext = {
				...mockContext,
				isValid: false,
				errors: { name: "Name is required" },
			};

			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_error",
			};

			await actionRegistry.execute(action, invalidContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.is_valid).toBe(false);
		});

		test("should handle GTM tracker errors", async () => {
			GTMTracker.push = () => {
				throw new Error("GTM push failed");
			};

			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("GTM push failed");
			expect(result.shouldContinue).toBe(true);
		});

		test("should handle non-Error exceptions", async () => {
			GTMTracker.push = () => {
				throw "String error";
			};

			const action: GTMEventActionInput = {
				id: "test-gtm",
				type: "gtm_event",
				enabled: true,
				eventName: "form_start",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("GTM event push failed");
			expect(result.shouldContinue).toBe(true);
		});
	});

	describe("Complex Event Scenarios", () => {
		test("should handle multi-step form progress tracking", async () => {
			const stepActions: GTMEventActionInput[] = [
				{
					id: "step-1-enter",
					type: "gtm_event",
					enabled: true,
					eventName: "step_enter",
					eventData: { step_name: "personal_info" },
				},
				{
					id: "step-1-complete",
					type: "gtm_event",
					enabled: true,
					eventName: "step_complete",
					eventData: { step_name: "personal_info" },
					includeFormData: ["name", "email"],
				},
				{
					id: "step-2-enter",
					type: "gtm_event",
					enabled: true,
					eventName: "step_enter",
					eventData: { step_name: "preferences" },
				},
			];

			for (const action of stepActions) {
				await actionRegistry.execute(action, mockContext);
			}

			expect(mockDataLayer).toHaveLength(3);
			
			expect(mockDataLayer[0].event).toBe("step_enter");
			expect(mockDataLayer[0].step_name).toBe("personal_info");
			
			expect(mockDataLayer[1].event).toBe("step_complete");
			expect(mockDataLayer[1].form_data).toEqual({
				name: "John",
				email: "john@example.com",
			});
			
			expect(mockDataLayer[2].event).toBe("step_enter");
			expect(mockDataLayer[2].step_name).toBe("preferences");
		});

		test("should handle conversion tracking with complete user journey", async () => {
			const conversionActions: GTMEventActionInput[] = [
				{
					id: "form-start",
					type: "gtm_event",
					enabled: true,
					eventName: "form_start",
					eventData: { 
						form_type: "lead_gen",
						campaign: "q4_promo",
					},
				},
				{
					id: "form-progress",
					type: "gtm_event",
					enabled: true,
					eventName: "form_progress",
					eventData: { 
						progress_percent: 66,
					},
					includeFormData: ["userType"],
				},
				{
					id: "form-conversion",
					type: "gtm_event",
					enabled: true,
					eventName: "conversion",
					eventData: { 
						value: 25.00,
						currency: "USD",
						conversion_label: "lead_signup",
					},
					includeFormData: true,
				},
			];

			for (const action of conversionActions) {
				await actionRegistry.execute(action, mockContext);
			}

			expect(mockDataLayer).toHaveLength(3);
			
			// Form start event
			expect(mockDataLayer[0].event).toBe("form_start");
			expect(mockDataLayer[0].form_type).toBe("lead_gen");
			expect(mockDataLayer[0].campaign).toBe("q4_promo");
			
			// Progress event
			expect(mockDataLayer[1].event).toBe("form_progress");
			expect(mockDataLayer[1].progress_percent).toBe(66);
			expect(mockDataLayer[1].form_data).toEqual({ userType: "premium" });
			
			// Conversion event
			expect(mockDataLayer[2].event).toBe("conversion");
			expect(mockDataLayer[2].value).toBe(25.00);
			expect(mockDataLayer[2].currency).toBe("USD");
			expect(mockDataLayer[2].form_data).toEqual(mockContext.formData);
		});
	});

	describe("Integration", () => {
		test("should register GTM plugin and execute successfully", async () => {
			expect(actionRegistry.has("gtm_event")).toBe(true);

			const action: GTMEventActionInput = {
				id: "integration-test",
				type: "gtm_event",
				enabled: true,
				eventName: "integration_test",
			};

			const result = await actionRegistry.execute(action, mockContext);
			expect(result.success).toBe(true);
			expect(mockDataLayer).toHaveLength(1);
			expect(mockDataLayer[0].event).toBe("integration_test");
		});

		test("should work with different GTM environments", async () => {
			const originalConsoleLog = console.log;
			const consoleMessages: string[] = [];
			
			console.log = (...args: any[]) => {
				consoleMessages.push(args.join(" "));
			};

			// Remove window to simulate SSR
			globalThis.window = undefined as any;

			// Mock GTMTracker for SSR
			GTMTracker.push = (event: string, data: Record<string, any> = {}) => {
				console.log("[GTM] Server-side event (not sent):", event, data);
			};

			const action: GTMEventActionInput = {
				id: "ssr-test",
				type: "gtm_event",
				enabled: true,
				eventName: "ssr_event",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(consoleMessages.some(msg => msg.includes("Server-side event"))).toBe(true);

			console.log = originalConsoleLog;
		});

		test("should handle missing dataLayer gracefully", async () => {
			globalThis.window = {} as any;

			const originalPush = GTMTracker.push;
			let pushCalled = false;

			GTMTracker.push = (event: string, data: Record<string, any> = {}) => {
				pushCalled = true;
				if (!(globalThis.window as any).dataLayer) {
					(globalThis.window as any).dataLayer = [];
				}
				(globalThis.window as any).dataLayer.push({
					event,
					...data,
					timestamp: new Date().toISOString(),
				});
			};

			const action: GTMEventActionInput = {
				id: "no-datalayer-test",
				type: "gtm_event",
				enabled: true,
				eventName: "test_event",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(pushCalled).toBe(true);

			GTMTracker.push = originalPush;
		});
	});
});