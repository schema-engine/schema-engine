import { FormNumber } from './form-number';
import type { NumberFieldConfig } from '@/registry/forms/inputs/form-number.types';
import { NumberFieldConfigSchema } from '@/registry/forms/inputs/form-number.types';
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
		description: 'Numeric input field with optional min, max, and step',
		category: 'input',
	},
});
