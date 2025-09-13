import { defaultFormFieldRegistry } from '@/lib/form-engine/schemas/registry';
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
defaultFormFieldRegistry.register({
	componentId: 'checkbox',
	component: FormCheckbox,
	runtimeSchema: CheckboxFieldConfigSchema,
	serializableSchema: CheckboxFieldConfigSchema,
	metadata: {
		title: 'Checkbox',
		description: 'Single checkbox for boolean values',
		category: 'input',
		example: checkboxFieldExample,
	},
});
