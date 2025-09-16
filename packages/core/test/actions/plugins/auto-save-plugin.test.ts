import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { actionRegistry } from "@/actions/action-registry";
import {
	autoSavePlugin,
	type AutoSaveAction,
	AutoSaveActionSchema,
	type AutoSaveStorage,
} from "@/actions/plugins/auto-save-plugin";
import type { ActionExecutionContext } from "@/actions/types";
import {
	createMockContext,
	setupTestEnvironment,
	MockLocalStorage,
} from "../__tools";
import {
	MockAutoSaveStorage,
	createFailingStorage,
} from "../__tools/storage-utils";describe("AutoSavePlugin", () => {
	let mockContext: ActionExecutionContext;
	let mockStorage: MockAutoSaveStorage;
	let mockLocalStorage: MockLocalStorage;

	beforeEach(() => {
		mockLocalStorage = setupTestEnvironment();
		mockStorage = new MockAutoSaveStorage();
		mockContext = createMockContext({
			formData: {
				field1: "value1",
				name: "John",
				email: "john@example.com",
				preferences: {
					theme: "dark",
				},
				password: "secret123",
			},
		});
	});	afterEach(() => {
		if (mockLocalStorage) {
			mockLocalStorage.clear();
		}
		if (mockStorage) {
			mockStorage.clear();
		}
	});

	describe("Schema Validation", () => {
		test("should validate valid auto-save action", () => {
			const validAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			expect(() => AutoSaveActionSchema.parse(validAction)).not.toThrow();
		});

		test("should validate auto-save action with all optional fields", () => {
			const fullAction = {
				id: "test-autosave",
				type: "auto_save",
				description: "Auto-save form data",
				enabled: true,
				triggers: ["form_change", "manual_save"],
				storageKey: "custom_key",
				includeSensitive: true,
			};

			expect(() => AutoSaveActionSchema.parse(fullAction)).not.toThrow();
		});

		test("should reject invalid type", () => {
			const invalidAction = {
				id: "test-autosave",
				type: "invalid_type",
				enabled: true,
			};

			expect(() => AutoSaveActionSchema.parse(invalidAction)).toThrow();
		});

		test("should require ID", () => {
			const invalidAction = {
				type: "auto_save",
				enabled: true,
			};

			expect(() => AutoSaveActionSchema.parse(invalidAction)).toThrow();
		});

		test("should default enabled to true", () => {
			const action = {
				id: "test-autosave",
				type: "auto_save",
			};

			const parsed = AutoSaveActionSchema.parse(action);
			expect(parsed.enabled).toBe(true);
		});

		test("should default includeSensitive to false", () => {
			const action = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			const parsed = AutoSaveActionSchema.parse(action);
			expect(parsed.includeSensitive).toBe(false);
		});
	});

	describe("Plugin Factory", () => {
		test("should create plugin with default configuration", () => {
			const plugin = autoSavePlugin();

			expect(plugin.type).toBe("auto_save");
			expect(plugin.schema).toBe(AutoSaveActionSchema);
			expect(plugin.defaultTriggers).toEqual(["form_change"]);
			expect(plugin.handler).toBeDefined();
		});

		test("should create plugin with custom storage", () => {
			const plugin = autoSavePlugin({
				storage: mockStorage,
			});

			expect(plugin.type).toBe("auto_save");
			expect(plugin.handler).toBeDefined();
		});

		test("should create plugin with custom handlers", () => {
			let saveCalled = false;
			let errorCalled = false;

			const plugin = autoSavePlugin({
				storage: mockStorage,
				onSave: (data, context) => {
					saveCalled = true;
				},
				onError: (error, context) => {
					errorCalled = true;
				},
			});

			expect(plugin.type).toBe("auto_save");
			expect(plugin.handler).toBeDefined();
		});

		test("should create plugin with custom storage key generator", () => {
			const plugin = autoSavePlugin({
				storage: mockStorage,
				getStorageKey: (context) => `custom_${context.formId}_${context.currentStep}`,
			});

			expect(plugin.type).toBe("auto_save");
			expect(plugin.handler).toBeDefined();
		});
	});

	describe("Action Execution", () => {
		test("should execute successful auto-save action", async () => {
		const plugin = autoSavePlugin({ storage: mockStorage });
		actionRegistry.register(plugin);

		const action: AutoSaveAction = {
			id: "test-autosave",
			type: "auto_save",
			enabled: true,
			includeSensitive: false,
		};

		const result = await actionRegistry.execute(action, mockContext);			expect(result.success).toBe(true);
			expect(result.message).toBe("Form data auto-saved to autosave_test-form");
			expect(result.shouldContinue).toBe(true);
		});

		test("should save data to storage with default key", async () => {
			const plugin = autoSavePlugin({ storage: mockStorage });
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			await actionRegistry.execute(action, mockContext);

			const savedData = mockStorage.getStoredData("autosave_test-form");
			expect(savedData).toEqual({
				field1: "value1",
				name: "John",
				email: "john@example.com",
				preferences: { theme: "dark" },
			});
		});

		test("should use custom storage key", async () => {
			const plugin = autoSavePlugin({ storage: mockStorage });
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
				storageKey: "custom_storage_key",
			};

			await actionRegistry.execute(action, mockContext);

			const savedData = mockStorage.getStoredData("custom_storage_key");
			expect(savedData).toBeDefined();
			expect(mockStorage.getStoredData("autosave_test-form")).toBeUndefined();
		});

		test("should use custom storage key generator", async () => {
			const plugin = autoSavePlugin({
				storage: mockStorage,
				getStorageKey: (context) => `generated_${context.formId}_${context.currentStep}`,
			});
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			await actionRegistry.execute(action, mockContext);

			const savedData = mockStorage.getStoredData("generated_test-form_0");
			expect(savedData).toBeDefined();
		});

		test("should prefer action storageKey over generator", async () => {
			const plugin = autoSavePlugin({
				storage: mockStorage,
				getStorageKey: (context) => `generated_${context.formId}`,
			});
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
				storageKey: "action_key",
			};

			await actionRegistry.execute(action, mockContext);

			const savedData = mockStorage.getStoredData("action_key");
			expect(savedData).toBeDefined();
			expect(mockStorage.getStoredData("generated_test-form")).toBeUndefined();
		});

		test("should filter sensitive data by default", async () => {
			const plugin = autoSavePlugin({ storage: mockStorage });
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			await actionRegistry.execute(action, mockContext);

			const savedData = mockStorage.getStoredData("autosave_test-form") as Record<string, any>;
			expect(savedData.password).toBeUndefined(); // Sensitive field filtered out
			expect(savedData.name).toBe("John"); // Non-sensitive field preserved
			expect(savedData.email).toBe("john@example.com");
		});

		test("should include sensitive data when specified", async () => {
			const plugin = autoSavePlugin({ storage: mockStorage });
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
				includeSensitive: true,
			};

			await actionRegistry.execute(action, mockContext);

			const savedData = mockStorage.getStoredData("autosave_test-form") as Record<string, any>;
			expect(savedData.password).toBe("secret123"); // Sensitive field included
			expect(savedData.name).toBe("John");
			expect(savedData.email).toBe("john@example.com");
		});

		test("should call onSave handler when provided", async () => {
			let savedData: unknown = null;
			let savedContext: ActionExecutionContext | null = null;

			const plugin = autoSavePlugin({
				storage: mockStorage,
				onSave: (data, context) => {
					savedData = data;
					savedContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			await actionRegistry.execute(action, mockContext);

			expect(savedData).toBeDefined();
			expect(savedContext).not.toBeNull();
			expect(savedContext!).toEqual(mockContext);
		});

		test("should handle empty form data", async () => {
			const emptyContext = {
				...mockContext,
				formData: {},
			};

			const plugin = autoSavePlugin({ storage: mockStorage });
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			const result = await actionRegistry.execute(action, emptyContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("No form data available for auto-save");
			expect(result.shouldContinue).toBe(true);
		});

		test("should handle storage errors", async () => {
			const failingStorage = createFailingStorage("Storage failed");

			let errorMessage: string | null = null;
			let errorContext: ActionExecutionContext | null = null;

			const plugin = autoSavePlugin({
				storage: failingStorage,
				onError: (error, context) => {
					errorMessage = error;
					errorContext = context;
				},
			});
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Storage failed");
			expect(result.shouldContinue).toBe(true);
			expect(errorMessage).not.toBeNull();
			expect(errorMessage!).toBe("Storage failed");
			expect(errorContext).not.toBeNull();
			expect(errorContext!).toEqual(mockContext);
		});

		test("should handle async onSave handler", async () => {
			let asyncSaveCalled = false;

			const plugin = autoSavePlugin({
				storage: mockStorage,
				onSave: async (data, context) => {
					await new Promise(resolve => setTimeout(resolve, 10));
					asyncSaveCalled = true;
				},
			});
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			expect(asyncSaveCalled).toBe(true);
		});

		test("should handle async onError handler", async () => {
			const failingStorage = createFailingStorage("Async storage error");

			let asyncErrorCalled = false;

			const plugin = autoSavePlugin({
				storage: failingStorage,
				onError: async (error, context) => {
					await new Promise(resolve => setTimeout(resolve, 10));
					asyncErrorCalled = true;
				},
			});
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(false);
			expect(asyncErrorCalled).toBe(true);
		});
	});

	describe("Default Storage (localStorage)", () => {
		test("should use localStorage as default storage", async () => {
			const plugin = autoSavePlugin(); // No storage provided
			actionRegistry.register(plugin);

			const action: AutoSaveAction = {
				id: "test-autosave",
				type: "auto_save",
				enabled: true,
			};

			const result = await actionRegistry.execute(action, mockContext);

			expect(result.success).toBe(true);
			
			// Check that data was saved to localStorage
			const savedData = mockLocalStorage.getItem("autosave_test-form");
			expect(savedData).toBeDefined();
			
			const parsedData = JSON.parse(savedData!);
			expect(parsedData.field1).toBe("value1");
			expect(parsedData.name).toBe("John");
			expect(parsedData.password).toBeUndefined(); // Sensitive data filtered by default
		});

		test("should handle localStorage save and load operations", () => {
			// Test localStorage save
			mockLocalStorage.setItem("test-key", JSON.stringify({ test: "data" }));

			expect(mockLocalStorage.getItem("test-key")).toBeDefined();
			const saved = JSON.parse(mockLocalStorage.getItem("test-key")!);
			expect(saved.test).toBe("data");
			
			// Test localStorage remove
			mockLocalStorage.removeItem("test-key");
			expect(mockLocalStorage.getItem("test-key")).toBeNull();
			
			// Test localStorage clear
			mockLocalStorage.setItem("key1", "value1");
			mockLocalStorage.setItem("key2", "value2");
			expect(mockLocalStorage.length).toBe(2);
			
			mockLocalStorage.clear();
			expect(mockLocalStorage.length).toBe(0);
			expect(mockLocalStorage.getItem("key1")).toBeNull();
		});
	});

	describe("Integration", () => {
		test("should register plugin and execute successfully", async () => {
			const plugin = autoSavePlugin({ storage: mockStorage });
			actionRegistry.register(plugin);

			expect(actionRegistry.has("auto_save")).toBe(true);

			const action: AutoSaveAction = {
				id: "integration-test",
				type: "auto_save",
				enabled: true,
			};

			const result = await actionRegistry.execute(action, mockContext);
			expect(result.success).toBe(true);
			expect(mockStorage.getAllKeys()).toContain("autosave_test-form");
		});

		test("should work with different storage backends", async () => {
			// Test with different storage implementations
			const memoryStorage = new MockAutoSaveStorage();
			const apiCalls: Array<{ key: string; data: any }> = [];

			const apiStorage: AutoSaveStorage = {
				save: async (key: string, data: unknown) => {
					apiCalls.push({ key, data });
				},
				load: async () => null,
				remove: async () => {},
			};

			const memoryPlugin = autoSavePlugin({ storage: memoryStorage });
			const apiPlugin = autoSavePlugin({ storage: apiStorage });

			actionRegistry.register(memoryPlugin);

			const action: AutoSaveAction = {
				id: "memory-test",
				type: "auto_save",
				enabled: true,
			};

			await actionRegistry.execute(action, mockContext);

			expect(memoryStorage.getAllKeys()).toContain("autosave_test-form");

			actionRegistry.clear();
			actionRegistry.register(apiPlugin);

			await actionRegistry.execute(action, mockContext);

			expect(apiCalls).toHaveLength(1);
			expect(apiCalls[0].key).toBe("autosave_test-form");
		});
	});
});