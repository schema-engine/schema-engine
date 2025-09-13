import { test, expect, describe, afterEach } from 'bun:test';
import { z } from 'zod';
import { BaseFieldSchema } from '@/lib/form-engine/schemas/base-field';
import { defaultFormFieldRegistry } from '@/lib/form-engine/schemas/registry';
import { 
	createArrayElementsRuntimeSchema, 
	type ArrayElementsConfig 
} from '@/lib/form-engine/components/form/fields/form-array-elements.types';

import '@/lib/form-engine/components/form/fields/form-input.registry';
import '@/lib/form-engine/components/form/fields/form-textarea.registry';
import '@/lib/form-engine/components/form/fields/form-select.registry';
import '@/lib/form-engine/components/form/fields/form-checkbox.registry';
import '@/lib/form-engine/components/form/fields/form-radio.registry';
import '@/lib/form-engine/components/form/fields/form-number.registry';
import '@/lib/form-engine/components/form/fields/form-switch.registry';
import '@/lib/form-engine/components/form/fields/form-array-elements.registry';

describe('Form Field Registry Extensibility', () => {
	const createCustomRatingSchema = (suffix: string = '') => BaseFieldSchema.extend({
		componentId: z.literal(`customRating${suffix}`),
		maxRating: z.number().min(1).max(10).default(5),
		allowHalf: z.boolean().default(false),
		iconType: z.enum(['star', 'heart', 'thumb']).default('star'),
	});

	const createMockComponent = (name: string) => ({ config }: { config: any }) => {
		return `${name}(${config.maxRating || 'default'})`;
	};

	const createFieldRegistration = (suffix: string = '') => {
		const componentId = `customRating${suffix}`;
		const schema = createCustomRatingSchema(suffix);
		
		return {
			componentId,
			schema,
			component: createMockComponent(componentId),
			registration: {
				componentId,
				component: createMockComponent(componentId),
				runtimeSchema: schema,
				serializableSchema: schema,
				metadata: {
					title: `Custom Rating Field ${suffix}`,
					description: `A custom rating field component ${suffix}`,
					category: 'input' as const,
				},
			},
		};
	};



	afterEach(() => {
		defaultFormFieldRegistry.unregister('customRating');
	});
    
    describe('Custom Field Registration', () => {
		test('should allow registering a custom field type', () => {
			const { componentId, registration } = createFieldRegistration('1')
			
			defaultFormFieldRegistry.register(registration);

			expect(defaultFormFieldRegistry.getFieldTypes()).toContain(componentId as any);
			
			expect(defaultFormFieldRegistry.getComponent(componentId as any)).toBeDefined();
			expect(defaultFormFieldRegistry.getMetadata(componentId as any)).toBeDefined();
			expect(defaultFormFieldRegistry.getMetadata(componentId as any)?.title).toBe(`Custom Rating Field 1`);
		});

		test('should validate custom field configuration', () => {
			const { componentId, registration } = createFieldRegistration('2');
			
			defaultFormFieldRegistry.register(registration);

			type CustomFieldConfig = z.infer<ReturnType<typeof createCustomRatingSchema>>;
			const validConfig: CustomFieldConfig = {
				componentId: componentId as any,
				id: 'rating',
				name: 'rating',
				label: 'Product Rating',
				maxRating: 5,
				allowHalf: true,
				iconType: 'star' as const,
			} 

			const result = defaultFormFieldRegistry.validateField(validConfig);
			expect(result.success).toBe(true);
			expect(result.data).toEqual(validConfig as any);
		});

		test('should reject invalid custom field configuration', () => {
			const { componentId, registration } = createFieldRegistration('3');
			
			defaultFormFieldRegistry.register(registration);

			const invalidConfig = {
				componentId: componentId as any,
				id: 'rating',
				name: 'rating',
				maxRating: 15,
				iconType: 'invalid',
			};

			const result = defaultFormFieldRegistry.validateField(invalidConfig);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
				expect(typeof result.error).toBe('string');
			}
		});

		test('should unregister custom field type', () => {
			const { componentId, registration } = createFieldRegistration('unregister');
			
			defaultFormFieldRegistry.register(registration);
			expect(defaultFormFieldRegistry.hasFieldType(componentId as any)).toBe(true);
			
			const wasRemoved = defaultFormFieldRegistry.unregister(componentId);
			expect(wasRemoved).toBe(true);
			expect(defaultFormFieldRegistry.hasFieldType(componentId as any)).toBe(false);
			expect(defaultFormFieldRegistry.getComponent(componentId as any)).toBeUndefined();
			expect(defaultFormFieldRegistry.getMetadata(componentId as any)).toBeUndefined();
		});
	});

	describe('Array Elements with Custom Fields', () => {
		test('should create runtime schema including custom fields and array elements', () => {
			const { componentId, registration } = createFieldRegistration('4');
			
			// Register the custom field
			defaultFormFieldRegistry.register(registration);

			const runtimeSchema = createArrayElementsRuntimeSchema(defaultFormFieldRegistry);
			
			const fieldTypes = defaultFormFieldRegistry.getFieldTypes();
			expect(fieldTypes).toContain(componentId);
			expect(fieldTypes).toContain('input');
			expect(fieldTypes).toContain('textarea');
			expect(fieldTypes).toContain('arrayElements');
		});

		test('should validate array elements containing custom fields', () => {
			const { componentId, registration } = createFieldRegistration('5');
			
			// Register the custom field
			defaultFormFieldRegistry.register(registration);

			const arrayConfig: ArrayElementsConfig = {
				componentId: 'arrayElements',
				id: 'reviews',
				name: 'reviews',
				label: 'Product Reviews',
				elements: [
					{
						componentId: 'input',
						id: 'title',
						name: 'title',
						label: 'Review Title',
						inputType: 'text',
					},
					{
						componentId: componentId as any,
						id: 'rating',
						name: 'rating',
						label: 'Rating',
						maxRating: 5,
						allowHalf: true,
						iconType: 'star',
					} as any,
					{
						componentId: 'textarea',
						id: 'comment',
						name: 'comment',
						label: 'Comment',
					},
				],
				minItems: 1,
				maxItems: 10,
			};

			const runtimeSchema = createArrayElementsRuntimeSchema(defaultFormFieldRegistry);
			const result = runtimeSchema.safeParse(arrayConfig);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.elements).toHaveLength(3);
				expect(result.data.elements[0].componentId).toBe('input');
				expect(result.data.elements[1].componentId).toBe(componentId as any);
				expect(result.data.elements[2].componentId).toBe('textarea');
				
				const customElement = result.data.elements[1] as any;
				expect(customElement.maxRating).toBe(5);
				expect(customElement.allowHalf).toBe(true);
				expect(customElement.iconType).toBe('star');
			}
		});

		test('should support recursive arrays (nested arrays)', () => {
			const nestedArrayConfig: ArrayElementsConfig = {
				componentId: 'arrayElements',
				id: 'nested',
				name: 'nested',
				label: 'Nested Arrays',
				elements: [
					{
						componentId: 'input',
						id: 'title',
						name: 'title',
						inputType: 'text',
					},
					{
						componentId: 'arrayElements',
						id: 'subArray',
						name: 'subArray',
						label: 'Sub Array',
						elements: [
							{
								componentId: 'input',
								id: 'subField',
								name: 'subField',
								inputType: 'text',
							},
						],
					},
				],
			};

			const runtimeSchema = createArrayElementsRuntimeSchema(defaultFormFieldRegistry);
			const fieldTypes = defaultFormFieldRegistry.getFieldTypes();
			
			expect(fieldTypes).toContain('arrayElements');
			
			const result = runtimeSchema.safeParse(nestedArrayConfig);
			expect(result.success).toBe(true);
		});
	});

	describe('Registry Union Schema Generation', () => {
		test('should create union schema from all registered fields', () => {
			const { componentId, registration } = createFieldRegistration('6');
			
			defaultFormFieldRegistry.register(registration);

			const unionSchema = defaultFormFieldRegistry.createFieldUnionSchema();
			expect(unionSchema).toBeDefined();

			// Test that the union accepts both built-in and custom field types
			const inputConfig = {
				componentId: 'input',
				id: 'test',
				name: 'test',
				inputType: 'text',
			};

			const customConfig = {
				componentId: componentId as any,
				id: 'rating',
				name: 'rating',
				maxRating: 3,
			};

			expect(unionSchema.safeParse(inputConfig).success).toBe(true);
			expect(unionSchema.safeParse(customConfig).success).toBe(true);
		});

		test('should handle empty registry gracefully', () => {
			const FormFieldComponentRegistry = defaultFormFieldRegistry.constructor as any;
			const emptyRegistry = new FormFieldComponentRegistry();

			expect(() => emptyRegistry.createFieldUnionSchema()).not.toThrow();
			expect(() => createArrayElementsRuntimeSchema(emptyRegistry)).not.toThrow();
		});
	});

	describe('Metadata and Documentation', () => {
		test('should preserve field metadata for custom fields', () => {
			const { componentId, registration } = createFieldRegistration('7');
			
			defaultFormFieldRegistry.register(registration);

			const metadata = defaultFormFieldRegistry.getMetadata(componentId as any);
			expect(metadata).toBeDefined();
			expect(metadata?.title).toBe(`Custom Rating Field 7`);
			expect(metadata?.description).toContain('custom rating field component');
			expect(metadata?.category).toBe('input');
		});

		test('should export all metadata for documentation', () => {
			const { componentId, registration } = createFieldRegistration('8');
			
			defaultFormFieldRegistry.register(registration);

			const allMetadata = defaultFormFieldRegistry.exportMetadata();
			expect(allMetadata).toBeDefined();
			expect(typeof allMetadata).toBe('object');
			
			expect(allMetadata[componentId]).toBeDefined();
			expect(allMetadata[componentId].title).toBe(`Custom Rating Field 8`);
		});
	});
});