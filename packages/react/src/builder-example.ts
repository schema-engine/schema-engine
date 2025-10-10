/**
 * Example: Using the new Builder Pattern with React
 *
 * This file demonstrates how to use the new FormEngineBuilder pattern
 * with React components. This is the recommended approach going forward.
 *
 * The old registry pattern (field-registry.ts) still works for backward compatibility.
 */

import {
	createReactFormEngine,
	toElementRegistration,
	type ReactElementRegistration,
} from '@/registries/builder-registry';
import { InputFieldSchema } from '@/components/form/fields/form-input.types';
import { FormInput } from '@/components/form/fields/form-input';
import { NumberFieldConfigSchema } from '@/components/form/fields/form-number.types';
import { FormNumber } from '@/components/form/fields/form-number';

/**
 * Define element registrations using the new pattern
 */
const inputElement: ReactElementRegistration = {
	componentId: 'input',
	component: FormInput,
	schema: InputFieldSchema,
	metadata: {
		name: 'Text Input',
		description: 'Text input field for various input types',
		category: 'input',
		icon: 'text',
	},
};

const numberElement: ReactElementRegistration = {
	componentId: 'number',
	component: FormNumber,
	schema: NumberFieldConfigSchema,
	metadata: {
		name: 'Number Input',
		description: 'Numeric input field with validation',
		category: 'input',
		icon: 'hash',
	},
};

/**
 * Build the form engine with React components
 */
export const reactFormEngine = createReactFormEngine()
	.addElement(toElementRegistration(inputElement))
	.addElement(toElementRegistration(numberElement))
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
