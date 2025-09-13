import { defaultFormFieldRegistry } from '@/lib/form-engine/schemas/registry';
import { SelectFieldConfigSchema } from './form-select.types';
import { FormSelect } from './form-select';

const selectFieldExample = {
	componentId: 'select' as const,
	id: 'select-field',
	name: 'selectField',
	label: 'Select an option',
	options: [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3' },
	],
};

/**
 * Register select field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
defaultFormFieldRegistry.register({
	componentId: 'select',
	component: FormSelect,
	runtimeSchema: SelectFieldConfigSchema,
	serializableSchema: SelectFieldConfigSchema,
	metadata: {
		title: 'Select Field',
		description: 'Dropdown selection field with multiple options',
		category: 'input',
		example: selectFieldExample,
	},
});
