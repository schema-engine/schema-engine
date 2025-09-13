/**
 * Extensible field configuration system
 * Uses module augmentation to allow library users to add their own field types
 */

/**
 * Global registry for field configurations
 * This interface can be extended by library users to add their own field types
 */
declare global {
	namespace FormEngine {
		/**
		 * Field configuration registry
		 * Library users can extend this interface to add their own field types:
		 *
		 * @example
		 * ```ts
		 * declare global {
		 *   namespace FormEngine {
		 *     interface FieldConfigRegistry {
		 *       myCustomField: MyCustomFieldConfig;
		 *     }
		 *   }
		 * }
		 * ```
		 */
		interface FieldConfigRegistry {
			// Core field types will be added by their respective type files
		}

		/**
		 * Union of all registered field configurations
		 * This type is automatically updated when new field types are registered
		 */
		type FieldConfig = FieldConfigRegistry[keyof FieldConfigRegistry];

		/**
		 * Extract component ID from field configuration
		 */
		type ComponentId = FieldConfig['componentId'];

		/**
		 * Get field configuration by component ID
		 */
		type GetFieldConfig<T extends ComponentId> = Extract<FieldConfig, { componentId: T }>;
	}
}

/**
 * Type guard to check if a value is a valid field configuration
 */
export function isFieldConfig(value: unknown): value is FormEngine.FieldConfig {
	return (
		typeof value === 'object' &&
		value !== null &&
		'componentId' in value &&
		typeof (value as any).componentId === 'string' &&
		'id' in value &&
		typeof (value as any).id === 'string' &&
		'name' in value &&
		typeof (value as any).name === 'string'
	);
}

/**
 * Extract field type from configuration
 */
export function getFieldType(config: FormEngine.FieldConfig): FormEngine.ComponentId {
	return config.componentId;
}

// Export types for convenience
export type FieldConfig = FormEngine.FieldConfig;
export type ComponentId = FormEngine.ComponentId;
export type GetFieldConfig<T extends ComponentId> = FormEngine.GetFieldConfig<T>;
