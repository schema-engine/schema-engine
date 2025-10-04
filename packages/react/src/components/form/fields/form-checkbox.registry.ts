import { registerFieldType } from '@/registries/field-registry';
import { CheckboxFieldConfigSchema } from './form-checkbox.types';
import { FormCheckbox } from './form-checkbox';

const checkboxFieldExample = {
	componentId: 'checkbox' as const,
	id: 'checkbox-field',
	name: 'checkboxField',
	label: 'Check this option',
	defaultValue: false,
};

/**
 * Register checkbox field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
export const checkboxFieldRegistration: FormEngine.FieldRegistration = {
	componentId: 'checkbox',
	component: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		title: 'Checkbox',
		description: 'Single checkbox for boolean values',
		category: 'input',
		example: checkboxFieldExample,
	},
};

registerFieldType(checkboxFieldRegistration);
