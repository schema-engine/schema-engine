import { FormTextarea } from './form-textarea';
import type { TextareaFieldConfig } from '@/registry/forms/inputs/form-textarea.types';
import { TextareaFieldSchema } from '@/registry/forms/inputs/form-textarea.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			textarea: TextareaFieldConfig;
		}
	}
}

export const TextareaElementRegistration = defineInput({
	$type: 'textarea',
	render: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
});
