import { FormNumber } from './form-number';
import type { NumberFieldConfig } from './form-number.types';
import { NumberFieldConfigSchema } from './form-number.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			number: NumberFieldConfig;
		}
	}
}

export const NumberElementRegistration = defineInput({
	$type: 'number',
	render: FormNumber,
	schema: NumberFieldConfigSchema,
	metadata: {
		name: 'Number Field',
		description: 'Number input field for numeric values',
		category: 'input',
	},
});
