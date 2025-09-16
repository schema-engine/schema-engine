import { registerFieldType } from '@/registry';
import { TextareaFieldSchema, textareaFieldExample } from './form-textarea.types';
import { FormTextarea } from './form-textarea';

/**
 * Register textarea field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
export const textareaFieldRegistration: FormEngine.FieldRegistration = {
	componentId: 'textarea',
	component: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		title: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
		example: textareaFieldExample,
	},
};

registerFieldType(textareaFieldRegistration);
