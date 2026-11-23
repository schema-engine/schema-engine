import { FormTextarea } from './form-textarea';
import { TextareaFieldSchema, textareaFieldValue } from './form-textarea.types';
import { defineInput } from '@schema-engine/forms';

export const TextareaElementRegistration = defineInput({
	$type: 'textarea',
	appearanceAxes: ['size'],
	render: FormTextarea,
	schema: TextareaFieldSchema,
	value: textareaFieldValue,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
});
