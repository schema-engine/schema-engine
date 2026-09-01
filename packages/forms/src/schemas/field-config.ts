import type { BaseField } from './base-field';

/**
 * Extensible field configuration system
 * Uses global namespace augmentation to allow library users to add their own field types
 */

/**
 * Global registry for fsield configurations
 * This interface can be extended by library users to add their own field types
 */
declare global {
	namespace FormEngine {
		/**
		 * Element/Field configuration registry
		 * Augment this interface to register element types.
		 * Each registration file imports its type and augments this interface.
		 *
		 * @example
		 * ```ts
		 * declare global {
		 *   namespace FormEngine {
		 *     interface ElementRegistry {
		 *       myCustomField: MyCustomFieldConfig;
		 *     }
		 *   }
		 * }
		 * ```
		 */
		interface ElementRegistry {}

		/**
		 * View recipe configuration registry
		 * Augment this interface to register view recipe types.
		 */
		interface RecipeRegistry {}

		/**
		 * Union of all registered view recipe configurations
		 */
		type ViewConfig = [keyof RecipeRegistry] extends [never]
			? import('../schemas/form-config').FormViewConfig & Record<string, unknown>
			: RecipeRegistry[keyof RecipeRegistry];

		/**
		 * Union of all registered recipe IDs
		 */
		type RecipeId = [keyof RecipeRegistry] extends [never] ? string : ViewConfig['$type'];

		/**
		 * Get view configuration by recipe ID
		 */
		type GetViewConfig<T extends RecipeId> = Extract<ViewConfig, { $type: T }>;

		/**
		 * Union of all registered element configurations
		 * This type is automatically updated when new element types are registered
		 */
		type UnregisteredElementConfig = BaseField &
			Record<string, unknown> & {
				elements?: UnregisteredElementConfig[];
			};

		/**
		 * Before a UI package registers any fields, keep the headless builder
		 * usable with open-ended custom configurations. Once registrations are
		 * present, the concrete discriminated union is used instead.
		 */
		type ElementConfig = keyof ElementRegistry extends never
			? UnregisteredElementConfig
			: ElementRegistry[keyof ElementRegistry];

		/**
		 * Union of all registered element IDs
		 * This creates a union type like: "input" | "textarea" | "select" | ...
		 */
		type ElementId = ElementConfig['$type'];

		/**
		 * Get element configuration by element ID
		 */
		type GetElementConfig<T extends ElementId> = Extract<ElementConfig, { $type: T }>;
	}
}
