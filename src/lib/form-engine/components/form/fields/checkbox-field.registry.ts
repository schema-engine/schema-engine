import { defaultFormRegistry } from '../../..';
import { CheckboxField } from '.';

/**
 * Register checkbox field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	name: 'checkbox',
	component: CheckboxField,
	category: 'input',
	description: 'Boolean checkbox field',
	example: {
		type: 'checkbox',
		id: 'example-checkbox',
		name: 'example',
		label: 'Example Checkbox',
	},
});
