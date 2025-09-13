import { defaultFormRegistry } from '../../..';
import { SelectField } from '.';

/**
 * Register select field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	componentId: 'select',
	component: SelectField,
	category: 'select',
	description: 'Dropdown selection field',
	example: {
		type: 'select',
		id: 'example-select',
		name: 'example',
		label: 'Example Select',
		placeholder: 'Choose an option...',
		options: [
			{ value: 'option1', label: 'Option 1' },
			{ value: 'option2', label: 'Option 2' },
		],
	},
});
