import { defaultFormRegistry } from '../../..';
import { RadioField } from './radio-field';

/**
 * Register radio field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	componentId: 'radio',
	component: RadioField,
	category: 'select',
	description: 'Radio button group for single selection',
	example: {
		type: 'radio',
		id: 'example-radio',
		name: 'example',
		label: 'Choose an option',
		options: [
			{ value: 'option1', label: 'Option 1' },
			{ value: 'option2', label: 'Option 2' },
			{ value: 'option3', label: 'Option 3' },
		],
	},
});
