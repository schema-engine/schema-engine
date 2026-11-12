import { FormSwitch } from './form-switch';
import { SwitchFieldConfigSchema } from './form-switch.types';
import { defineInput } from '@schema-engine/forms';

export const SwitchElementRegistration = defineInput({
	$type: 'switch',
	appearanceAxes: ['size'],
	render: FormSwitch,
	schema: SwitchFieldConfigSchema,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field',
		category: 'input',
	},
});
