/**
 * Extensible field configuration system
 * Uses module augmentation to allow library users to add their own field types
 */

import type { BaseField } from "./base-field";

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

declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			/**
			 * This is a placeholder to ensure the interface is not empty.
			 * It is needed in order to do not get compiler errors when no fields are registered yet.
			 * Do not use this in your code.
			 */
			__TYPE_DEF_INIT__: {
				componentId: '__TYPE_DEF_INIT__';
			} & BaseField;
		}
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
        'id' in value &&
        'name' in value &&
        typeof value.componentId === 'string' &&
        typeof value.id === 'string' &&
        typeof value.name === 'string'
	);
}

/**
 * Extract field type from configuration
 */
export function getFieldType(config: FormEngine.FieldConfig): FormEngine.ComponentId {
	return config.componentId;
}

export type FieldConfig = FormEngine.FieldConfig;
export type ComponentId = FormEngine.ComponentId;
export type GetFieldConfig<T extends ComponentId> = FormEngine.GetFieldConfig<T>;
