import { FormTextarea } from './form-textarea';
import type { TextareaFieldConfig, TextareaFieldProps } from './form-textarea.types';
import { TextareaFieldSchema } from './form-textarea.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			textarea: TextareaFieldConfig;
		}
	}
}

export const TextareaElementRegistration: ElementRegistration<TextareaFieldConfig, TextareaFieldProps> = {
	$type: 'textarea',
	render: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
};
