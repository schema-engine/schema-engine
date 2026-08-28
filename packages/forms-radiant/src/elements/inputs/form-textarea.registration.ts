import { FormTextarea } from './form-textarea';
import type { TextareaFieldConfig, TextareaFieldProps } from '@/registry/forms/inputs/form-textarea.types';
import { TextareaFieldSchema } from '@/registry/forms/inputs/form-textarea.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(TextareaFieldSchema),
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
};
