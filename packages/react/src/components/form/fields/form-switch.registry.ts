import { defaultFormFieldRegistry } from '@json-form-engine/core/schemas/registry';
import { SwitchFieldConfigSchema } from './form-switch.types';
import { FormSwitch } from './form-switch';

const switchFieldExample = {
	componentId: 'switch' as const,
	id: 'switch-field',
	name: 'switchField',
	label: 'Enable this option',
	defaultValue: false,
};

/**
 * Register switch field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
export const switchFieldRegistration: FormEngine.FieldRegistration = {
	componentId: 'switch',
	component: FormSwitch,
	schema: SwitchFieldConfigSchema,
	metadata: {
		title: 'Switch',
		description: 'Toggle switch for boolean values',
		category: 'input',
		example: switchFieldExample,
	},
};

defaultFormFieldRegistry.register(switchFieldRegistration);
