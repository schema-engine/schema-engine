import { FormSwitch } from './form-switch';
import type { SwitchFieldConfig } from './form-switch.types';
import { SwitchFieldConfigSchema } from './form-switch.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			switch: SwitchFieldConfig;
		}
	}
}

export const SwitchElementRegistration = defineInput({
	$type: 'switch',
	render: FormSwitch,
	schema: SwitchFieldConfigSchema,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field',
		category: 'input',
	},
});
