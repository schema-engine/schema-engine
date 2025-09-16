import type { z } from 'zod';
import type { BaseField } from './base-field';

/**
 * Global form field elements registry
 * This interface will be extended by each field type registration
 * to provide strict typing for field configurations
 */
declare global {
	/**
	 * Registry of form field elements with their specific configurations
	 * Each field type should extend this interface with its own props
	 *
	 * Example:
	 * ```ts
	 * declare global {
	 *   namespace FormEngine {
	 *     interface FormFieldElements {
	 *       input: InputFieldProps;
	 *       select: SelectFieldProps;
	 *     }
	 *   }
	 * }
	 * ```
	 */
	namespace FormEngine {
		interface FormFieldElements extends BaseField {
			// Base interface - will be extended by field registrations
		}

		type FormFieldElementsValues = FormFieldElements[keyof FormFieldElements];

		/**
		 * Field configuration metadata for registries
		 */
		interface FieldMetadata {
			/** Unique identifier for the field type */
			id?: string;
			/** Display name for the field type */
			title?: string;
			/** Description of what this field type does */
			description?: string;
			/** Category for grouping field types */
			category?: string;
			/** Whether this field type is deprecated */
			deprecated?: boolean;
			/** Example configuration for this field type */
			example?: any;
		}

		/**
		 * Base field component props interface
		 * All field components should implement this interface
		 */
		interface FieldComponentProps<TConfig = BaseField> {
			config: TConfig;
			onChange?: (value: any) => void;
			onBlur?: () => void;
			onFocus?: () => void;
		}

		/**
		 * Field registration configuration
		 * Generic interface that can work with any component type
		 */
		interface FieldRegistration<TComponent = React.ComponentType<any>> {
			/** Unique component identifier */
			componentId: string;
			/** Component for rendering the field */
			component: TComponent;
			/** Schema for validation, serialization and type checking */
			schema: z.ZodSchema<any>;
			/** Metadata for documentation and tooling */
			metadata?: FieldMetadata;
		}
	}
}

/**
 * Utility types for working with form field elements
 */

/**
 * Field type discriminator
 */
export type FieldType = string;

// Re-export for convenience
export type { BaseField } from './base-field';
