import { FormInput } from './form-input';
import type { InputFieldConfig, InputFieldProps } from '@/registry/forms/inputs/form-input.types';
import { InputFieldSchema } from '@/registry/forms/inputs/form-input.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
		}
	}
}

export const InputElementRegistration: InputRegistration<'input', InputFieldConfig, InputFieldProps> = {
	$type: 'input',
	render: FormInput,
	schema: asStandardSchema(InputFieldSchema),
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
};
