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
		description: 'Numeric input field with optional min, max, and step',
		category: 'input',
	},
});
