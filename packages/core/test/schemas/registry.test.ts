
import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { z } from "zod";
import {
	FormFieldComponentRegistry,
	formFieldRegistry,
} from "../../src/schemas/registry";

type MockComponent = { name: string; render: (props: any) => any };

const MockComponent: MockComponent = { 
	name: "MockComponent", 
	render: (props: any) => props 
};

const MockSelectComponent: MockComponent = { 
	name: "MockSelectComponent", 
	render: (props: any) => props 
};


const testInputSchema = z.object({
	componentId: z.literal("test-input"),
	id: z.string(),
	name: z.string(),
	label: z.string().optional(),
	placeholder: z.string().optional(),
	required: z.boolean().optional(),
});

const testSelectSchema = z.object({
	componentId: z.literal("test-select"),
	id: z.string(),
	name: z.string(),
	label: z.string().optional(),
	options: z.array(z.object({
		value: z.string(),
		label: z.string(),
	})),
	value: z.string().optional(),
	required: z.boolean().optional(),
});

const testInputMetadata: FormEngine.FieldMetadata = {
	id: "test-input",
	title: "Test Input",
	description: "A test input field",
	category: "basic",
	deprecated: false,
	example: {
		componentId: "test-input",
		id: "test",
		name: "test",
		label: "Test Field",
	},
};

const testSelectMetadata: FormEngine.FieldMetadata = {
	id: "test-select",
	title: "Test Select",
	description: "A test select field",
	category: "basic",
	deprecated: false,
	example: {
		componentId: "test-select",
		id: "test-select",
		name: "test-select",
		label: "Test Select",
		options: [
			{ value: "option1", label: "Option 1" },
			{ value: "option2", label: "Option 2" },
		],
	},
};

const testInputRegistration: FormEngine.FieldRegistration<MockComponent> = {
	componentId: "test-input",
	component: MockComponent,
	schema: testInputSchema, 
	metadata: testInputMetadata,
};

const testSelectRegistration: FormEngine.FieldRegistration<MockComponent> = {
	componentId: "test-select",
	component: MockSelectComponent,
	schema: testSelectSchema, 
	metadata: testSelectMetadata,
};

declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			'test-input': z.infer<typeof testInputSchema>;
			'test-select': z.infer<typeof testSelectSchema>;
		}
	}
}

const asComponentId = (value: string) => value as FormEngine.ComponentId;

describe("FormFieldComponentRegistry", () => {
	let registry: FormFieldComponentRegistry<MockComponent>;

	beforeEach(() => {
		registry = new FormFieldComponentRegistry<MockComponent>(z.registry<FormEngine.FieldMetadata>());
		formFieldRegistry.clear();
	});

	afterEach(() => {
		registry.clear();
		formFieldRegistry.clear(); 
	});

	describe("Basic Registration", () => {
		test("should register a field type successfully", () => {
			registry.register(testInputRegistration);
			
			expect(registry.hasFieldType("test-input" as any)).toBe(true);
			expect(registry.getFieldTypes()).toContain("test-input");
			expect(registry.getComponent("test-input" as any)).toBe(MockComponent);
		});

		test("should register multiple field types", () => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
			
			expect(registry.hasFieldType(asComponentId("test-input"))).toBe(true);
			expect(registry.hasFieldType(asComponentId("test-select"))).toBe(true);
			expect(registry.getFieldTypes()).toEqual(
				expect.arrayContaining(["test-input", "test-select"])
			);
		});

		test("should update existing field registration", () => {
			registry.register(testInputRegistration);
			
			const newRegistration: FormEngine.FieldRegistration<MockComponent> = {
				componentId: "test-input",
				component: MockSelectComponent,
				schema: testInputSchema.clone(), // Clone the schema for a fresh instance
				metadata: {
					...testInputMetadata,
					id: "test-input-updated",
				},
			};
			
			registry.register(newRegistration);
			
			expect(registry.getComponent(asComponentId("test-input"))).toBe(MockSelectComponent);
		});

		test("should register field without metadata", () => {
			const registrationWithoutMetadata: FormEngine.FieldRegistration<MockComponent> = {
				componentId: "no-metadata",
				component: MockComponent,
				schema: testInputSchema.extend({
					componentId: z.literal("no-metadata")
				}),
			};
			
			registry.register(registrationWithoutMetadata);
			
			expect(registry.hasFieldType(asComponentId("no-metadata"))).toBe(true);
			expect(registry.getMetadata(asComponentId("no-metadata"))).toBeUndefined();
		});

		test("should register field without metadata", () => {
			const registrationWithoutMetadata: FormEngine.FieldRegistration<MockComponent> = {
				componentId: "no-metadata",
				component: MockComponent,
				schema: testInputSchema.extend({
					componentId: z.literal("no-metadata")
				}),
			};
			
			registry.register(registrationWithoutMetadata);
			
			expect(registry.hasFieldType(asComponentId("no-metadata"))).toBe(true);
			expect(registry.getMetadata(asComponentId("no-metadata"))).toBeUndefined();
		});
	});

	describe("Schema Retrieval", () => {
		beforeEach(() => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
		});

		test("should return correct runtime schema", () => {
			const schema = registry.getRuntimeSchema(asComponentId("test-input"));
			expect(schema).toBeDefined();
			expect(schema).toBe(testInputSchema); // Now using serializable schema as the single schema
		});

		test("should return correct serializable schema", () => {
			const schema = registry.getSerializableSchema(asComponentId("test-input"));
			expect(schema).toBeDefined();
			expect(schema).toBe(testInputSchema); // Now returns the single schema
		});

		test("should return undefined for non-existent field type", () => {
			expect(registry.getRuntimeSchema(asComponentId("non-existent"))).toBeUndefined();
			expect(registry.getSerializableSchema(asComponentId("non-existent"))).toBeUndefined();
		});
	});

	describe("Component Retrieval", () => {
		beforeEach(() => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
		});

		test("should return correct component", () => {
			expect(registry.getComponent(asComponentId("test-input"))).toBe(MockComponent);
			expect(registry.getComponent(asComponentId("test-select"))).toBe(MockSelectComponent);
		});

		test("should return undefined for non-existent component", () => {
			expect(registry.getComponent(asComponentId("non-existent"))).toBeUndefined();
		});
	});

	describe("Metadata Retrieval", () => {
		beforeEach(() => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
		});

		test("should return correct metadata", () => {
			const metadata = registry.getMetadata(asComponentId("test-input"));
			expect(metadata).toEqual(expect.objectContaining({
				id: "test-input",
				title: "Test Input",
				description: "A test input field",
				category: "basic",
			}));
		});

		test("should return undefined for non-existent field type", () => {
			expect(registry.getMetadata(asComponentId("non-existent"))).toBeUndefined();
		});
	});

	describe("Registry Inspection", () => {
		test("should return empty arrays when no fields registered", () => {
			expect(registry.getFieldTypes()).toEqual([]);
			expect(registry.getRegisteredFields()).toEqual([]);
		});

		test("should return correct field types after registration", () => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
			
			const fieldTypes = registry.getFieldTypes();
			const registeredFields = registry.getRegisteredFields();
			
			expect(fieldTypes).toEqual(expect.arrayContaining(["test-input", "test-select"]));
			expect(registeredFields).toEqual(expect.arrayContaining(["test-input", "test-select"]));
			expect(fieldTypes.length).toBe(2);
			expect(registeredFields.length).toBe(2);
		});

		test("should check field type existence correctly", () => {
			registry.register(testInputRegistration);
			
			expect(registry.hasFieldType(asComponentId("test-input"))).toBe(true);
			expect(registry.hasFieldType(asComponentId("non-existent"))).toBe(false);
		});
	});

	describe("Unregistration", () => {
		beforeEach(() => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
		});

		test("should unregister a single field type", () => {
			const result = registry.unregister("test-input");
			
			expect(result).toBe(true);
			expect(registry.hasFieldType(asComponentId("test-input"))).toBe(false);
			expect(registry.hasFieldType(asComponentId("test-select"))).toBe(true);
		});

		test("should return false when unregistering non-existent field", () => {
			const result = registry.unregister("non-existent");
			expect(result).toBe(false);
		});

		test("should clear specific fields", () => {
			registry.clearFields(["test-input"]);
			
			expect(registry.hasFieldType(asComponentId("test-input"))).toBe(false);
			expect(registry.hasFieldType(asComponentId("test-select"))).toBe(true);
		});

		test("should clear all fields", () => {
			expect(registry.getFieldTypes().length).toBe(2);
			
			registry.clear();
			
			expect(registry.getFieldTypes().length).toBe(0);
			expect(registry.hasFieldType(asComponentId("test-input"))).toBe(false);
			expect(registry.hasFieldType(asComponentId("test-select"))).toBe(false);
		});
	});

	describe("Union Schema Creation", () => {
		test("should return z.never() for empty registry", () => {
			const unionSchema = registry.createFieldUnionSchema();
			expect(unionSchema).toBeInstanceOf(z.ZodNever);
		});

		test("should return single schema for single field", () => {
			registry.register(testInputRegistration);
			
			const unionSchema = registry.createFieldUnionSchema();
			expect(unionSchema).toBeDefined();
		});

		test("should create union schema for multiple fields", () => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
			
			const unionSchema = registry.createFieldUnionSchema();
			expect(unionSchema).toBeInstanceOf(z.ZodUnion);
		});

		test("should create serializable union schema", () => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
			
			const unionSchema = registry.createSerializableFieldUnionSchema();
			expect(unionSchema).toBeInstanceOf(z.ZodUnion);
		});
	});

	describe("Field Validation", () => {
		beforeEach(() => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
		});

		test("should validate correct field configuration", () => {
			const validConfig = {
				componentId: "test-input" as any,
				id: "test",
				name: "test",
				label: "Test Label",
			};
			
			const result = registry.validateField(validConfig);
			
			expect(result.success).toBe(true);
			expect(result.data).toEqual(validConfig);
			expect(result.error).toBeUndefined();
		});

		test("should reject invalid field configuration", () => {
			const invalidConfig = {
				componentId: "test-input" as any,
			};
			
			const result = registry.validateField(invalidConfig);
			
			expect(result.success).toBe(false);
			expect(result.data).toBeUndefined();
			expect(result.error).toBeDefined();
		});

		test("should reject non-object configurations", () => {
			const result1 = registry.validateField(null);
			const result2 = registry.validateField("string");
			const result3 = registry.validateField(123);
			
			expect(result1.success).toBe(false);
			expect(result2.success).toBe(false);
			expect(result3.success).toBe(false);
		});

		test("should reject configuration without componentId", () => {
			const configWithoutComponentId = {
				id: "test",
				name: "test",
			};
			
			const result = registry.validateField(configWithoutComponentId);
			
			expect(result.success).toBe(false);
			expect(result.error).toContain("componentId is required");
		});

		test("should reject configuration with unknown componentId", () => {
			const configWithUnknownType = {
				componentId: "unknown-type",
				id: "test",
				name: "test",
			};
			
			const result = registry.validateField(configWithUnknownType);
			
			expect(result.success).toBe(false);
			expect(result.error).toContain("Unknown field type: unknown-type");
		});
	});

	describe("Serialization", () => {
		beforeEach(() => {
			registry.register(testInputRegistration);
			registry.register(testSelectRegistration);
		});

		test("should convert field to serializable format", () => {
			const fieldConfig = {
				componentId: "test-input" as any,
				id: "test",
				name: "test",
				label: "Test Label",
				value: "test-value", 
			};
			
			const serializable = registry.toSerializable(fieldConfig);
			
			expect(serializable).toEqual({
				componentId: "test-input" as any,
				id: "test",
				name: "test",
				label: "Test Label",
			});
		});

		test("should return null for invalid field configuration", () => {
			const invalidConfig = { componentId: "unknown" };
			const result = registry.toSerializable(invalidConfig);
			expect(result).toBeNull();
		});

		test("should export metadata correctly", () => {
			const metadata = registry.exportMetadata();
			
			expect(metadata).toHaveProperty("test-input");
			expect(metadata).toHaveProperty("test-select");
			expect(metadata["test-input"]).toEqual(expect.objectContaining({
				id: "test-input",
				title: "Test Input",
				description: "A test input field",
			}));
		});

		test("should generate JSON schema registry", () => {
			const jsonSchemas = registry.toJSONSchemaRegistry();
			
			expect(jsonSchemas).toHaveProperty("test-input");
			expect(jsonSchemas).toHaveProperty("test-select");
			expect(typeof jsonSchemas["test-input"]).toBe("object");
		});
	});

	describe("Edge Cases and Error Handling", () => {
		test("should handle registration with null/undefined values gracefully", () => {
			expect(() => {
				registry.register({
					componentId: "test",
					component: MockComponent,
					schema: testInputSchema,
					metadata: undefined,
				});
			}).not.toThrow();
		});

		test("should handle empty string componentId", () => {
			const emptyIdRegistration: FormEngine.FieldRegistration<MockComponent> = {
				componentId: "",
				component: MockComponent,
				schema: testInputSchema,
			};
			
			registry.register(emptyIdRegistration);
			expect(registry.hasFieldType(asComponentId(""))).toBe(true);
		});

		test("should handle multiple calls to clear()", () => {
			registry.register(testInputRegistration);
			registry.clear();
			registry.clear(); // Should not throw
			
			expect(registry.getFieldTypes().length).toBe(0);
		});

		test("should handle concurrent registrations", () => {
			const registrations = Array.from({ length: 10 }, (_, i) => ({
				componentId: `test-${i}`,
				component: MockComponent,
				schema: testInputSchema.extend({
					componentId: z.literal(`test-${i}`)
				}),
			}));
			
			registrations.forEach(reg => registry.register(reg));
			
			expect(registry.getFieldTypes()).toHaveLength(10);
			registrations.forEach((_, i) => {
				expect(registry.hasFieldType(asComponentId(`test-${i}`))).toBe(true);
			});
		});

		test("should handle validation of deeply nested objects", () => {
			registry.register(testSelectRegistration);
			
			const deepObject = {
				componentId: "test-select",
				id: "test",
				name: "test",
				options: [
					{
						value: "deep",
						label: "Deep Option",
					},
				],
			};
			
			const result = registry.validateField(deepObject);
			expect(result.success).toBe(true);
		});
	});
});

describe("Global Registry Integration", () => {
	let registry: FormFieldComponentRegistry;

	beforeEach(() => {
		registry = new FormFieldComponentRegistry();
		formFieldRegistry.clear();
	});

	test("should add metadata to global registry on registration", () => {
		registry.register(testInputRegistration);
		
		const schema = registry.getRuntimeSchema(asComponentId("test-input"));
		expect(schema).toBeDefined();
		
		if (schema) {
			const metadata = formFieldRegistry.get(schema);
			expect(metadata).toEqual(expect.objectContaining({
				id: "test-input",
				title: "Test Input",
				description: "A test input field",
			}));
		}
	});

	test("should remove metadata from global registry on unregistration", () => {
		registry.register(testInputRegistration);
		const schema = registry.getRuntimeSchema(asComponentId("test-input"));
		
		expect(formFieldRegistry.has(schema!)).toBe(true);
		
		registry.unregister("test-input");
		
		expect(formFieldRegistry.has(schema!)).toBe(false);
	});

	test("should clear global registry on clear()", () => {
		registry.register(testInputRegistration);
		registry.register(testSelectRegistration);
		
		const inputSchema = registry.getRuntimeSchema(asComponentId("test-input"));
		const selectSchema = registry.getRuntimeSchema(asComponentId("test-select"));
		expect(formFieldRegistry.has(inputSchema!)).toBe(true);
		expect(formFieldRegistry.has(selectSchema!)).toBe(true);
		
		registry.clear();
		
		expect(formFieldRegistry.has(inputSchema!)).toBe(false);
		expect(formFieldRegistry.has(selectSchema!)).toBe(false);
	});
});