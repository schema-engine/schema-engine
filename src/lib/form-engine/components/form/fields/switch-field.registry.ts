import { defaultFormRegistry } from '../../..';
import { SwitchField } from './switch-field';

/**
 * Register switch field component
 * Tree-shakable: Only imported when needed
 */
defaultFormRegistry.register({
	name: 'switch',
	component: SwitchField,
	category: 'input',
	description: 'Boolean switch/toggle field',
	example: {
		type: 'switch',
		id: 'example-switch',
		name: 'example',
		label: 'Example Switch',
	},
});
