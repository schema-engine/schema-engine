/**
 * Example: Using the Builder Pattern with React
 *
 * This file demonstrates how to use the FormEngineBuilder pattern
 * with React components.
 */

import { createReactFormEngine } from '@/registries/builder-registry';
import { InputElementRegistration } from '@/components/elements/inputs/form-input.registration';
import { NumberElementRegistration } from '@/components/elements/inputs/form-number.registration';

/**
 * Build the form engine with React components
 *
 * Element registrations are imported directly from their registration files.
 * Each registration file exports the full registration object with type augmentation.
 */
export const reactFormEngine = createReactFormEngine()
	.addElement(InputElementRegistration)
	.addElement(NumberElementRegistration)
	// Add more elements, layouts, steppers, actions...
	.build();

/**
 * Usage in your application:
 *
 * ```typescript
 * import { reactFormEngine } from '@json-form-engine/react/builder-example';
 *
 * // Get an element
 * const inputComponent = reactFormEngine.getElement('input');
 *
 * // Get all elements
 * const allElements = reactFormEngine.getAllElements();
 *
 * // Check if element exists
 * if (reactFormEngine.hasElement('input')) {
 *   // Use it
 * }
 * ```
 */
