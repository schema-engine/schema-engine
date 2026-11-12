import { FormNumber } from './form-number';
import { NumberFieldConfigSchema } from './form-number.types';
import { defineInput } from '@schema-engine/forms';

export const NumberElementRegistration = defineInput({
	$type: 'number',
	appearanceAxes: ['size'],
	render: FormNumber,
	schema: NumberFieldConfigSchema,
	metadata: {
		name: 'Number Field',
		description: 'Number input field for numeric values',
		category: 'input',
	},
});
