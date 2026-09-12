import { FormInput } from './form-input';
import type { InputFieldConfig } from '@/registry/forms/inputs/form-input.types';
import { InputFieldSchema } from '@/registry/forms/inputs/form-input.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
		}
	}
}

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
