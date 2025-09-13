/**
 * Default Array Element Strategies
 *
 * This file registers common array element strategies that developers can use
 * out of the box, and serves as examples for how to create custom strategies.
 */

import { z } from 'zod';
import { registerArrayElementStrategy } from './array-element-strategies';

// Import all field schemas to create union strategies
import { InputFieldSchema } from '../components/form/fields/form-input.types';
import { TextareaFieldSchema } from '../components/form/fields/form-textarea.types';
import { SelectFieldConfigSchema } from '../components/form/fields/form-select.types';
import { CheckboxFieldConfigSchema } from '../components/form/fields/form-checkbox.types';
import { RadioFieldConfigSchema } from '../components/form/fields/form-radio.types';
import { NumberFieldConfigSchema } from '../components/form/fields/form-number.types';
import { SwitchFieldConfigSchema } from '../components/form/fields/form-switch.types';

/**
 * Strategy: Basic Form Fields
 * Allows input, textarea, select, checkbox, radio, number, and switch fields
 * This prevents recursion by not including array elements
 */
const basicFormFieldsStrategy = z.union([
	InputFieldSchema,
	TextareaFieldSchema,
	SelectFieldConfigSchema,
	CheckboxFieldConfigSchema,
	RadioFieldConfigSchema,
	NumberFieldConfigSchema,
	SwitchFieldConfigSchema,
]);

/**
 * Strategy: Input Fields Only
 * Only allows input fields - useful for simple arrays
 */
const inputOnlyStrategy = InputFieldSchema;

/**
 * Strategy: Text Fields Only
 * Only allows input and textarea fields
 */
const textFieldsOnlyStrategy = z.union([InputFieldSchema, TextareaFieldSchema]);

/**
 * Strategy: Selection Fields Only
 * Only allows select, checkbox, radio fields
 */
const selectionFieldsOnlyStrategy = z.union([
	SelectFieldConfigSchema,
	CheckboxFieldConfigSchema,
	RadioFieldConfigSchema,
]);

// Register default strategies
registerArrayElementStrategy('basicFormFields', basicFormFieldsStrategy);
registerArrayElementStrategy('inputOnly', inputOnlyStrategy);
registerArrayElementStrategy('textFieldsOnly', textFieldsOnlyStrategy);
registerArrayElementStrategy('selectionFieldsOnly', selectionFieldsOnlyStrategy);

/**
 * Register strategies in the global type system
 */
declare global {
	namespace FormEngine {
		interface ArrayElementStrategies {
			basicFormFields: typeof basicFormFieldsStrategy;
			inputOnly: typeof inputOnlyStrategy;
			textFieldsOnly: typeof textFieldsOnlyStrategy;
			selectionFieldsOnly: typeof selectionFieldsOnlyStrategy;
		}
	}
}

/**
 * Example of how developers can create recursive strategies
 * (This would be done by the library user in their own code)
 */
export function createRecursiveStrategy() {
	// Import the ArrayElementConfigSchema after it's defined
	const { ArrayElementConfigSchema } = require('../components/form/fields/form-array-elements.types');

	const recursiveStrategy = z.union([
		InputFieldSchema,
		TextareaFieldSchema,
		SelectFieldConfigSchema,
		ArrayElementConfigSchema, // ✅ This allows nested arrays
	]);

	registerArrayElementStrategy('recursive', recursiveStrategy);

	// Augment the global types (would be done by the library user)
	/*
	declare global {
		namespace FormEngine {
			interface ArrayElementStrategies {
				recursive: typeof recursiveStrategy;
			}
		}
	}
	*/

	return recursiveStrategy;
}
