import { defaultFormRegistry } from '../../..';
import { InputField } from '.';

/**
 * Register input field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	name: 'input',
	component: InputField,
	category: 'input',
	description: 'Text input field for various input types',
	example: {
		type: 'input',
		inputType: 'text',
		id: 'example-input',
		name: 'example',
		label: 'Example Input',
		placeholder: 'Enter text...',
	},
});
