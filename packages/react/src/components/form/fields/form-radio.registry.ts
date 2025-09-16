import { registerFieldType } from '@/registry';
import { RadioFieldConfigSchema } from './form-radio.types';
import { FormRadio } from './form-radio';

const radioFieldExample = {
	componentId: 'radio' as const,
	id: 'radio-field',
	name: 'radioField',
	label: 'Choose an option',
	options: [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3' },
	],
	orientation: 'vertical' as const,
};

/**
 * Register radio field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
export const radioFieldRegistration: FormEngine.FieldRegistration = {
	componentId: 'radio',
	component: FormRadio,
	schema: RadioFieldConfigSchema,
	metadata: {
		title: 'Radio Group',
		description: 'Radio button group for single selection',
		category: 'input',
		example: radioFieldExample,
	},
};

registerFieldType(radioFieldRegistration);
