/**
 * ARRAY ELEMENTS FIELD TYPE
 *
 * Defines schemas and types for array fields that can contain any registered field type,
 * including nested arrays for full recursive support.
 *
 * ## DUAL VALIDATION APPROACH
 *
 * ### Runtime Schema Validation
 * - `ArrayElementConfigSchema`: Static schema for basic validation using BaseFieldSchema
 * - `createArrayElementsRuntimeSchema()`: Dynamic factory that creates schemas at runtime
 *   - Builds field union from registry to support all registered field types
 *   - Supports nested arrays through recursive field inclusion
 *   - Handles empty registries gracefully by falling back to BaseFieldSchema
 *
 * ### Compile-time Type Safety
 * - `ArrayElementsConfig`: Uses FormEngine.ElementConfig union for full type safety
 * - Supports recursive arrays (arrays containing arrays at any depth)
 * - Provides complete TypeScript IntelliSense and type checking
 * - Extends global FormEngine namespace for registry integration
 *
 * ## ARCHITECTURE
 *
 * ### Registry Integration
 * - Factory function pattern enables dynamic schema generation
 * - Registry dependency injection provides testability
 * - Custom fields registered via FormComposer work automatically
 * - No code changes needed when new field types are added
 *
 * ### Recursive Support
 * - Schema validation includes all field types including 'arrayElements'
 * - Type definitions use full FormEngine.ElementConfig union
 * - Supports unlimited nesting depth
 * - Zod handles recursive validation automatically
 *
 * ## USAGE EXAMPLE
 * ```typescript
 * const arrayField: ArrayElementsConfig = {
 *   id: 'arrayElements',
 *   name: 'contacts',
 *   elements: [
 *     { id: 'textInput', name: 'name' },
 *     { id: 'email', name: 'email' },
 *     {
 *       id: 'arrayElements',
 *       name: 'addresses',
 *       elements: [{ id: 'textInput', name: 'street' }]
 *     }
 *   ]
 * };
 * ```
 */

import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

/**
 * Array field extension schema - defines array-specific properties
 * The elements property uses BaseFieldSchema as a base, but actual validation
 * will be done at runtime using the registry union
 */
export const ArrayElementsExtensionSchema = z.object({
	minItems: z.number().min(0).optional().describe('Minimum number of items allowed'),
	maxItems: z.number().min(1).optional().describe('Maximum number of items allowed'),
	addButtonText: z.string().optional().describe('Text for the add button'),
	removeButtonText: z.string().optional().describe('Text for the remove button'),
	emptyStateMessage: z.string().optional().describe('Message shown when array is empty'),
	initialValues: z.record(z.string(), z.any()).optional().describe('Default values for new items'),
	elements: z.array(BaseFieldSchema).min(1).describe('Field definitions for each item in the array'),
});

/**
 * Complete array field configuration schema
 * Uses z.any() for elements to match the TypeScript type FormEngine.ElementConfig[]
 * Runtime validation should use createArrayElementsRuntimeSchema() instead
 */
export const ArrayElementConfigSchema: z.ZodType<ArrayElementsConfig> = BaseFieldSchema.extend({
	$type: z.literal('arrayElements'),
	minItems: z.number().min(0).optional(),
	maxItems: z.number().min(1).optional(),
	addButtonText: z.string().optional(),
	removeButtonText: z.string().optional(),
	emptyStateMessage: z.string().optional(),
	initialValues: z.record(z.string(), z.any()).optional(),
	elements: z.array(z.any()).min(1) as z.ZodType<FormEngine.ElementConfig[]>,
}) as z.ZodType<ArrayElementsConfig>;

const COMPONENT_ID = 'arrayElements';

/**
 * Factory function to create a runtime validation schema with proper field union
 * This uses the registry to create the actual validation schema at runtime
 * Supports recursive arrays (arrays containing other arrays)
 */
export function createArrayElementsRuntimeSchema(registry: {
	createFieldUnionSchema: () => z.ZodSchema<any> | z.ZodNever;
	getFieldTypes: () => any[];
	getRuntimeSchema: (fieldType: any) => z.ZodSchema<any> | undefined;
}): z.ZodSchema<ArrayElementsConfig> {
	const fieldTypes = registry.getFieldTypes();
	const schemas = fieldTypes.map((type) => registry.getRuntimeSchema(type)).filter(Boolean) as z.ZodSchema<any>[];

	let fieldUnion: z.ZodSchema<any>;

	if (schemas.length === 0) {
		fieldUnion = BaseFieldSchema;
	} else if (schemas.length === 1) {
		fieldUnion = schemas[0];
	} else {
		fieldUnion = z.union(schemas as [z.ZodSchema<any>, z.ZodSchema<any>, ...z.ZodSchema<any>[]]);
	}

	const runtimeExtensionSchema = z.object({
		minItems: z.number().min(0).optional(),
		maxItems: z.number().min(1).optional(),
		addButtonText: z.string().optional(),
		removeButtonText: z.string().optional(),
		emptyStateMessage: z.string().optional(),
		initialValues: z.record(z.string(), z.any()).optional(),
		elements: z.array(fieldUnion).min(1),
	});

	return BaseFieldSchema.extend({
		$type: z.literal(COMPONENT_ID),
		...runtimeExtensionSchema.shape,
	});
}

/**
 * Type definitions for array elements
 * These use the full FormEngine.ElementConfig union to support recursive arrays
 */
export interface ArrayElementsExtension {
	minItems?: number;
	maxItems?: number;
	addButtonText?: string;
	removeButtonText?: string;
	emptyStateMessage?: string;
	initialValues?: Record<string, any>;
	elements: FormEngine.ElementConfig[];
}

export interface ArrayElementsConfig extends Omit<z.infer<typeof BaseFieldSchema>, never> {
	$type: 'arrayElements';
	minItems?: number;
	maxItems?: number;
	addButtonText?: string;
	removeButtonText?: string;
	emptyStateMessage?: string;
	initialValues?: Record<string, any>;
	elements: FormEngine.ElementConfig[];
}

/**
 * Array elements field component props interface
 * Adds optional handlers for form integration
 */
export type ArrayElementsProps = ArrayElementsConfig & {
	onChange?: (value: unknown) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
