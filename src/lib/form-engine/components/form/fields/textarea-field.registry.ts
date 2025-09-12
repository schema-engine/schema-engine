import { defaultFormRegistry } from '../../..';
import { TextareaField } from '.';

/**
 * Register textarea field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	name: 'textarea',
	component: TextareaField,
	category: 'input',
	description: 'Multi-line text input field',
	example: {
		type: 'textarea',
		id: 'example-textarea',
		name: 'example',
		label: 'Example Textarea',
		placeholder: 'Enter multiple lines...',
		rows: 4,
	},
});
