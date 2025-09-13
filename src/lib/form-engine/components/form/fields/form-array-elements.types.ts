/**
 * ARRAY ELEMENTS EXTENSIBILITY TRANSFORMATION
 *
 * This file represents a major architectural shift from hardcoded field schemas to a fully
 * extensible registry-based system. Here's what was accomplished:
 *
 * ## PROBLEM SOLVED
 * Previously, array elements were limited to hardcoded BaseFieldSchema, preventing developers
 * from using custom field types in arrays. The system needed to leverage the registry properly
 * to allow any registered field type as array elements.
 *
 * ## DUAL APPROACH: SCHEMA vs TYPES
 *
 * ### 1. SCHEMA LAYER (Runtime Validation)
 * - `ArrayElementConfigSchema`: Static schema using BaseFieldSchema (for basic validation)
 * - `createArrayElementsRuntimeSchema()`: Dynamic factory function that creates schemas at runtime
 *   - Uses registry.createFieldUnionSchema() to include ALL registered field types
 *   - Excludes 'arrayElements' to prevent infinite recursion
 *   - Supports empty registry gracefully
 *   - Enables custom field validation in arrays
 *
 * ### 2. TYPE LAYER (Compile-time Safety)
 * - `ArrayElementsConfig`: Uses FormEngine.FieldConfig union for compile-time type safety
 * - `Exclude<FormEngine.FieldConfig, ArrayElementsConfig>`: Prevents infinite type recursion
 * - Global namespace extension for registry typing
 * - Full TypeScript IntelliSense and type checking
 *
 * ## KEY ARCHITECTURAL DECISIONS
 *
 * ### Registry Integration
 * - Factory function pattern allows runtime schema generation
 * - Registry dependency injection for testability
 * - Graceful degradation when registry is empty
 *
 * ### Recursion Prevention
 * - Schema level: Filter out 'arrayElements' componentId from field types
 * - Type level: Exclude<> utility type prevents circular references
 * - Both approaches ensure arrays can't contain themselves
 *
 * ### Extensibility Model
 * - Custom fields registered via defaultFormFieldRegistry work automatically
 * - No code changes needed when new field types are added
 * - Maintains backward compatibility with existing field types
 *
 * ## BEFORE vs AFTER
 *
 * ### BEFORE (Hardcoded)
 * ```typescript
 * elements: z.array(BaseFieldSchema)  // Only basic fields allowed
 * elements: BaseFieldConfig[]         // Limited type safety
 * ```
 *
 * ### AFTER (Extensible)
 * ```typescript
 * // Runtime: Dynamic union from registry
 * elements: z.array(fieldUnion)  // All registered field types
 *
 * // Types: Full FormEngine.FieldConfig union
 * elements: Exclude<FormEngine.FieldConfig, ArrayElementsConfig>[]
 * ```
 *
 * ## BENEFITS ACHIEVED
 * Custom field types work in arrays automatically
 * Compile-time TypeScript safety maintained
 * Runtime Zod validation with registry integration
 * Infinite recursion prevention (both schema & type levels)
 * Backward compatibility preserved
 * Testable architecture with dependency injection
 * Graceful handling of empty registries
 *
 * This transformation enables the form engine to be truly extensible while maintaining
 * both runtime safety and compile-time type checking.
 */

import { z } from 'zod';
import { BaseFieldSchema } from '../../../schemas/base-field';

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
	elements: z.array(BaseFieldSchema).min(1).describe('Field definitions for each item in the array'),
});

/**
 * Complete array field configuration schema
 */
export const ArrayElementConfigSchema = BaseFieldSchema.extend({
	componentId: z.literal('arrayElements'),
	...ArrayElementsExtensionSchema.shape,
});

const COMPONENT_ID = 'arrayElements';

/**
 * Factory function to create a runtime validation schema with proper field union
 * This uses the registry to create the actual validation schema at runtime
 * Excludes arrayElements to prevent infinite recursion
 */
export function createArrayElementsRuntimeSchema(registry: {
	createFieldUnionSchema: () => z.ZodSchema<any> | z.ZodNever;
	getFieldTypes: () => any[];
	getRuntimeSchema: (fieldType: any) => z.ZodSchema<any> | undefined;
}): z.ZodSchema<ArrayElementsConfig> {
	const fieldTypes = registry.getFieldTypes().filter((type) => type !== COMPONENT_ID);
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
		elements: z.array(fieldUnion).min(1),
	});

	return BaseFieldSchema.extend({
		componentId: z.literal(COMPONENT_ID),
		...runtimeExtensionSchema.shape,
	});
}

/**
 * Type definitions for array elements
 * These explicitly use the FormEngine.FieldConfig union but exclude arrayElements
 * to prevent infinite recursion
 */
export interface ArrayElementsExtension {
	minItems?: number;
	maxItems?: number;
	addButtonText?: string;
	removeButtonText?: string;
	elements: Exclude<FormEngine.FieldConfig, ArrayElementsConfig>[];
}

export interface ArrayElementsConfig extends Omit<z.infer<typeof BaseFieldSchema>, never> {
	componentId: 'arrayElements';
	minItems?: number;
	maxItems?: number;
	addButtonText?: string;
	removeButtonText?: string;
	elements: Exclude<FormEngine.FieldConfig, ArrayElementsConfig>[];
}

/**
 * Extend the global FormEngine interface
 */
declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			arrayElements: ArrayElementsConfig;
		}
	}
}
