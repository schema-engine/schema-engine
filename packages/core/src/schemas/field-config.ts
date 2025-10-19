/**
 * Extensible field configuration system
 * Uses global namespace augmentation to allow library users to add their own field types
 */

/**
 * Global registry for field configurations
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
		 * Layout configuration registry
		 * Augment this interface to register layout types.
		 */
		interface LayoutRegistry {}

		/**
		 * Stepper configuration registry
		 * Augment this interface to register stepper types.
		 */
		interface StepperRegistry {}

		/**
		 * Union of all registered element configurations
		 * This type is automatically updated when new element types are registered
		 */
		type ElementConfig = ElementRegistry[keyof ElementRegistry];

		/**
		 * Union of all registered layout configurations
		 */
		type LayoutConfig = LayoutRegistry[keyof LayoutRegistry];

		/**
		 * Union of all registered stepper configurations
		 */
		type StepperConfig = StepperRegistry[keyof StepperRegistry];

		/**
		 * Union of all registered element IDs
		 * This creates a union type like: "input" | "textarea" | "select" | ...
		 */
		type ElementId = ElementConfig['$type'];

		/**
		 * Union of all registered layout IDs
		 */
		type LayoutId = LayoutConfig['$type'];

		/**
		 * Union of all registered stepper IDs
		 */
		type StepperId = StepperConfig['$type'];

		/**
		 * Get element configuration by element ID
		 */
		type GetElementConfig<T extends ElementId> = Extract<ElementConfig, { $type: T }>;

		/**
		 * Get layout configuration by layout ID
		 */
		type GetLayoutConfig<T extends LayoutId> = Extract<LayoutConfig, { $type: T }>;

		/**
		 * Get stepper configuration by stepper ID
		 */
		type GetStepperConfig<T extends StepperId> = Extract<StepperConfig, { $type: T }>;
	}
} /**
 * Type guard to check if a value is a valid element configuration
 */
export function isElementConfig(value: unknown): value is { $type: string; name: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'$type' in value &&
		'name' in value &&
		typeof value.$type === 'string' &&
		typeof value.name === 'string'
	);
}

/**
 * Extract element ID from configuration
 */
export function getElementId<T extends { $type: string }>(config: T): T['$type'] {
	return config.$type;
}
