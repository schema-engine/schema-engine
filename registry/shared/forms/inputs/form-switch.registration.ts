import { FormSwitch } from './form-switch';
import { SwitchFieldConfigSchema, switchFieldValue } from './form-switch.types';
import { defineInput } from '@schema-engine/forms';

export const SwitchElementRegistration = defineInput({
	$type: 'switch',
	appearanceAxes: ['size'],
	render: FormSwitch,
	schema: SwitchFieldConfigSchema,
	value: switchFieldValue,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field for boolean values',
		category: 'input',
	},
});
