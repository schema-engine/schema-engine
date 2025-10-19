import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { z } from "zod";
import {
	submitPlugin,
	SubmitActionSchema,
	type SubmitAction,
} from "@/actions/plugins/submit-plugin";
import { FormEngineBuilder } from "@/builder";
import { ActionExecutor } from "@/actions/action-executor";
import type { FormEngine } from "@/engine/form-engine";
import { createMockBuilderContext, setupTestEnvironment, createMockFetch, createFailingMockFetch } from "../__tools";

describe("SubmitPlugin", () => {
	let engine: FormEngine;
	let executor: ActionExecutor;
	let originalFetch: typeof fetch;

	beforeEach(() => {
		setupTestEnvironment();
		originalFetch = global.fetch;
		global.fetch = createMockFetch({ 
			"/api/submit": { ok: true, data: { success: true, id: "123" } } 
		});
	});

	afterEach(() => {
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

	describe('Plugin Factory', () => {
		test('should create plugin with default configuration', () => {
			const plugin = submitPlugin();

			expect(plugin.$type).toBe('submit');
			expect(plugin.execute).toBeDefined();
			expect(plugin.schema).toBe(SubmitActionSchema);
			expect(plugin.metadata.defaultTriggers).toEqual(["form_submit"]);
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

			expect(plugin.$type).toBe("submit");
			expect(plugin.execute).toBeDefined();
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

			expect(plugin.$type).toBe('submit');
			expect(typeof plugin.execute).toBe('function');
		});
	});

	describe('Action Execution', () => {
		test("should execute successful submit action", async () => {
			const plugin = submitPlugin();

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toContain("Form submitted successfully");
		});

		test("should handle submit failure", async () => {
			global.fetch = createFailingMockFetch();

			const plugin = submitPlugin();

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		test("should call custom success handler", async () => {
			let successData: any = null;
			let successContext: any = null;

			const plugin = submitPlugin({
				onSuccess: (data, context) => {
					successData = data;
					successContext = context;
				},
			});

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			await plugin.execute(context);

			expect(successData).toEqual({ success: true, id: "123" });
			expect(successContext).not.toBeNull();
		});

		test("should call custom error handler", async () => {
			global.fetch = createFailingMockFetch();

			let errorData: any = null;
			let errorContext: any = null;

			const plugin = submitPlugin({
				onError: (error, context) => {
					errorData = error;
					errorContext = context;
				},
			});

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			await plugin.execute(context);

			expect(errorData).toBeDefined();
			expect(errorContext).not.toBeNull();
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

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			await plugin.execute(context);

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

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/custom",
				method: "PUT",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			await plugin.execute(context);

			expect(customRequestCalled).toBe(true);
			expect(requestUrl).not.toBeNull();
			expect(requestUrl!).toBe("/api/custom");
			expect(requestOptions?.method).toBe("PUT");
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

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "https://api.example.com/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			await plugin.execute(context);

			expect(requestUrl).not.toBeNull();
			expect(requestUrl!).toBe("https://api.example.com/submit");
		});

		test("should include custom success and error messages", async () => {
			const plugin = submitPlugin();

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
				successMessage: "Custom success message",
				errorMessage: "Custom error message",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Custom success message");
		});

		test("should handle network errors", async () => {
			(global.fetch as any) = async () => {
				throw new Error("Network error");
			};

			const plugin = submitPlugin();

			const action: SubmitAction = {
				id: "test-submit",
				type: "submit",
				enabled: true,
				endpoint: "/api/submit",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Network error");
		});
	});

	describe("Integration", () => {
		test("should register plugin and execute successfully", async () => {
			const plugin = submitPlugin();

			const action: SubmitAction = {
				id: "integration-test",
				type: "submit",
				enabled: true,
				endpoint: "/api/integration",
				method: "POST",
			};

			const context = createMockBuilderContext(action, {
				formData: { name: "John", email: "john@example.com" },
			});
			const result = await plugin.execute(context);
			
			expect(result.success).toBe(true);
		});
	});
});