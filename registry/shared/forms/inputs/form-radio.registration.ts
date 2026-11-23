import { FormRadio } from './form-radio';
import { RadioFieldConfigSchema, radioFieldValue } from './form-radio.types';
import { defineInput } from '@schema-engine/forms';

export const RadioElementRegistration = defineInput({
	$type: 'radio',
	appearanceAxes: ['size'],
	render: FormRadio,
	schema: RadioFieldConfigSchema,
	value: radioFieldValue,
	metadata: {
		name: 'Radio Field',
		description: 'Radio button field for single selection from multiple options',
		category: 'input',
	},
});
