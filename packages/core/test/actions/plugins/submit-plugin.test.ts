import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { z } from "zod";
import {
	submitPlugin,
	SubmitActionSchema,
	type SubmitAction,
} from "@/actions/plugins/submit-plugin";
import { actionRegistry } from "@/actions/action-registry";
import type { ActionExecutionContext } from "@/actions/types";
import { createMockContext, setupTestEnvironment, createMockFetch, createFailingMockFetch } from "../__tools";

const mockContext = createMockContext({
	formData: { name: "John", email: "john@example.com" },
});

describe("SubmitPlugin", () => {
	// Store original fetch for cleanup
	let originalFetch: typeof fetch;

	beforeEach(() => {
		setupTestEnvironment();
		originalFetch = global.fetch;
		// Set default successful fetch mock
		global.fetch = createMockFetch({ 
			"/api/submit": { ok: true, data: { success: true, id: "123" } } 
		});
	});

	afterEach(() => {
		actionRegistry.clear();
		global.fetch = originalFetch;
	});

	describe("Schema Validation", () => {
		test("should validate valid submit action", () => {
			const validAction: SubmitAction = {
				id: "submit-form",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const result = SubmitActionSchema.parse(validAction);
			expect(result).toEqual(validAction);
		});

		test("should validate submit action with all optional fields", () => {
			const fullAction: SubmitAction = {
				id: "submit-form",
				type: "submit",
				description: "Submit the form data",
				enabled: true,
				triggers: ["form_submit"],
				endpoint: "https://api.example.com/submit",
				method: "PUT",
				successMessage: "Form submitted successfully!",
				errorMessage: "Failed to submit form",
				redirectUrl: "/success",
			};

			const result = SubmitActionSchema.parse(fullAction);
			expect(result).toEqual(fullAction);
		});

		test("should reject invalid endpoint", () => {
			const invalidAction = {
				id: "submit-form",
				type: "submit",
				enabled: true,
				endpoint: "", // Empty endpoint
				method: "POST",
			};

			expect(() => SubmitActionSchema.parse(invalidAction)).toThrow("Endpoint cannot be empty");
		});

		test("should reject invalid method", () => {
			const invalidAction = {
				id: "submit-form",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "DELETE", // Invalid method
			};

			expect(() => SubmitActionSchema.parse(invalidAction)).toThrow();
		});

		test("should default method to POST", () => {
			const action = {
				id: "submit-form",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				// No method specified
			};

			const result = SubmitActionSchema.parse(action);
			expect(result.method).toBe("POST");
		});
	});

	describe("Plugin Factory", () => {
		test("should create plugin with default configuration", () => {
			const plugin = submitPlugin();

			expect(plugin.type).toBe("submit");
			expect(plugin.handler).toBeDefined();
			expect(plugin.schema).toBe(SubmitActionSchema);
			expect(plugin.defaultTriggers).toEqual(["form_submit"]);
		});

		test("should create plugin with custom configuration", () => {
			let successCalled = false;
			let errorCalled = false;
			let transformCalled = false;

			const plugin = submitPlugin({
				onSuccess: (data, context) => {
					successCalled = true;
				},
				onError: (error, context) => {
					errorCalled = true;
				},
				transformData: (data, context) => {
					transformCalled = true;
					return { ...data, transformed: true };
				},
			});

			expect(plugin.type).toBe("submit");
			expect(plugin.handler).toBeDefined();
		});

		test("should create plugin with custom request adapter", () => {
			let customRequestCalled = false;

			const plugin = submitPlugin({
				request: async (url, options) => {
					customRequestCalled = true;
					const mockFetch = createMockFetch({ 
						[url]: { ok: true, data: { success: true, id: "123" } } 
					});
					return mockFetch(url, options);
				},
			});

			expect(plugin.type).toBe("submit");
			expect(plugin.handler).toBeDefined();
		});
	});

	describe("Action Execution", () => {
		test("should execute successful submit action", async () => {
			const plugin = submitPlugin();
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toContain("Form submitted successfully");
		});

		test("should handle submit failure", async () => {
			global.fetch = createFailingMockFetch();

			const plugin = submitPlugin();
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should call custom success handler", async () => {
			let successData: any = null;
			let successContext: ActionExecutionContext | null = null;

			const plugin = submitPlugin({
				onSuccess: (data, context) => {
					successData = data;
					successContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			await actionRegistry.execute(action, mockContext);

			expect(successData).toEqual({ success: true, id: "123" });
			expect(successContext).not.toBeNull();
			expect(successContext!).toEqual(mockContext);
		});

		test("should call custom error handler", async () => {
			global.fetch = createFailingMockFetch();

			let errorData: any = null;
			let errorContext: ActionExecutionContext | null = null;

			const plugin = submitPlugin({
				onError: (error, context) => {
					errorData = error;
					errorContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			await actionRegistry.execute(action, mockContext);

			expect(errorData).toBeDefined();
			expect(errorContext).not.toBeNull();
			expect(errorContext!).toEqual(mockContext);
		});

		test("should transform data before sending", async () => {
			let requestBody: any = null;

			(global.fetch as any) = async (url: string, options: any) => {
				requestBody = JSON.parse(options.body);
				const mockFetch = createMockFetch({ 
					[url]: { ok: true, data: { success: true, id: "123" } } 
				});
				return mockFetch(url, options);
			};

			const plugin = submitPlugin({
				transformData: (data, context) => ({
					...data,
					timestamp: "2024-01-01T00:00:00Z",
					formId: context.formId,
				}),
			});
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			await actionRegistry.execute(action, mockContext);

			expect(requestBody).toEqual({
				name: "John",
				email: "john@example.com",
				timestamp: "2024-01-01T00:00:00Z",
				formId: "test-form",
				metadata: {
					stepStartTime: expect.any(Number),
					totalFormTime: 1000,
					userInteractions: 5,
				},
			});
		});

		test("should use custom request adapter", async () => {
			let customRequestCalled = false;
			let requestUrl: string | null = null;
			let requestOptions: any = null;

			const plugin = submitPlugin({
				request: async (url, options) => {
					customRequestCalled = true;
					requestUrl = url;
					requestOptions = options;
					const mockFetch = createMockFetch({ 
						[url]: { ok: true, data: { success: true, id: "123" } } 
					});
					return mockFetch(url, options);
				},
			});
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/custom",
				method: "PUT",
			};

			await actionRegistry.execute(action, mockContext);

			expect(customRequestCalled).toBe(true);
			expect(requestUrl).not.toBeNull();
			expect(requestUrl!).toBe("/api/custom");
			expect(requestOptions?.method).toBe("PUT");
		});

		test("should handle validation failure", async () => {
			const plugin = submitPlugin({
				validate: (context) => "Custom validation failed",
			});
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Custom validation failed");
		});

		test("should pass validation when validator returns true", async () => {
			const plugin = submitPlugin({
				validate: (context) => true,
			});
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
		});

		test("should handle full URL endpoints", async () => {
			let requestUrl: string | null = null;

			(global.fetch as any) = async (url: string, options: any) => {
				requestUrl = url;
				const mockFetch = createMockFetch({ 
					[url]: { ok: true, data: { success: true, id: "123" } } 
				});
				return mockFetch(url, options);
			};

			const plugin = submitPlugin();
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "https://api.example.com/submit",
				method: "POST",
			};

			await actionRegistry.execute(action, mockContext);

			expect(requestUrl).not.toBeNull();
			expect(requestUrl!).toBe("https://api.example.com/submit");
		});

		test("should include custom success and error messages", async () => {
			const plugin = submitPlugin();
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
				successMessage: "Custom success message",
				errorMessage: "Custom error message",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Custom success message");
		});

		test("should handle network errors", async () => {
			(global.fetch as any) = async () => {
				throw new Error("Network error");
			};

			const plugin = submitPlugin();
			actionRegistry.register(plugin);

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Network error");
		});
	});

	describe("Integration", () => {
		test("should register plugin and execute successfully", async () => {
			const plugin = submitPlugin();
			actionRegistry.register(plugin);

			expect(actionRegistry.has("submit")).toBe(true);

			const action: SubmitAction = {
				id: "integration-test",
				type: "submit",
				enabled: true,
				endpoint: "/api/integration",
				method: "POST",
			};

			const result = await actionRegistry.execute(action, mockContext);
			expect(result.success).toBe(true);
		});
	});
});