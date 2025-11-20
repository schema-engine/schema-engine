import { FormTextarea } from './form-textarea';
import type { TextareaFieldConfig, TextareaFieldProps } from './form-textarea.types';
import { TextareaFieldSchema } from './form-textarea.types';
import type { InputRegistration } from '@schema-engine/forms/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			textarea: TextareaFieldConfig;
		}
	}
}

export const TextareaElementRegistration: InputRegistration<'textarea', TextareaFieldConfig, TextareaFieldProps> = {
	$type: 'textarea',
	render: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
};
