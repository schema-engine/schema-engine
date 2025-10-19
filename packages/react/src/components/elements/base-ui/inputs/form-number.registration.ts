import { FormNumber } from './form-number';
import type { NumberFieldConfig, NumberFieldProps } from './form-number.types';
import { NumberFieldConfigSchema } from './form-number.types';
import type { ElementRegistration } from '@json-form-engine/core';

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
		description: 'Number input field for numeric values',
		category: 'input',
	},
};
