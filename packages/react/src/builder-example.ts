/**
 * Example: Using the new Builder Pattern with React
 *
 * This file demonstrates how to use the new FormEngineBuilder pattern
 * with React components. This is the recommended approach going forward.
 *
 * The old registry pattern (field-registry.ts) still works for backward compatibility.
 */

import { createReactFormEngine } from '@/registries/builder-registry';
import { InputElement } from '@/components/form/fields/form-input';
import { NumberElement } from '@/components/form/fields/form-number';

/**
 * Build the form engine with React components
 *
 * Element registrations are imported directly from their component files.
 * Each component file exports both the component and its registration.
 */
export const reactFormEngine = createReactFormEngine()
	.addElement(InputElement)
	.addElement(NumberElement)
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
