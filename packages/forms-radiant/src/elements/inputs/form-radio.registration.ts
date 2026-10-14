import { FormRadio } from './form-radio';
import { RadioFieldConfigSchema } from './form-radio.types';
import { defineInput } from '@schema-engine/forms';

export const RadioElementRegistration = defineInput({
	$type: 'radio',
	render: FormRadio,
	schema: RadioFieldConfigSchema,
	metadata: {
		name: 'Radio Field',
		description: 'Radio button group field',
		category: 'input',
	},
});
