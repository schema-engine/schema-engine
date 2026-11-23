import { FormInput } from './form-input';
import { InputFieldSchema, inputFieldValue } from './form-input.types';
import { defineInput } from '@schema-engine/forms';

export const InputElementRegistration = defineInput({
	$type: 'input',
	appearanceAxes: ['size'],
	render: FormInput,
	schema: InputFieldSchema,
	value: inputFieldValue,
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
});
