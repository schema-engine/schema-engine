import { FormSwitch } from './form-switch';
import type { SwitchFieldConfig } from '@/registry/forms/inputs/form-switch.types';
import { SwitchFieldConfigSchema } from '@/registry/forms/inputs/form-switch.types';
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
