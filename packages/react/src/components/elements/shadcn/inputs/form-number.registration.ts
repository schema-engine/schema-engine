/**
 * Number Element Registration with Type Augmentation
 */

import { FormNumber } from './form-number';
import type { NumberFieldConfig, NumberFieldProps } from './form-number.types';
import { NumberFieldConfigSchema } from './form-number.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			number: NumberFieldConfig;
		}
	}
}

export const NumberElementRegistration: ElementRegistration<NumberFieldConfig, NumberFieldProps> = {
	$type: 'number',
	render: FormNumber,
	schema: NumberFieldConfigSchema,
	metadata: {
		name: 'Number Field',
		description: 'Numeric input field with min, max, and step controls',
		category: 'input',
	},
};
