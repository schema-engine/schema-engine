import { FormInput } from './form-input';
import { InputFieldSchema } from './form-input.types';
import { defineInput } from '@schema-engine/forms';

export const InputElementRegistration = defineInput({
	$type: 'input',
	render: FormInput,
	schema: InputFieldSchema,
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
});
