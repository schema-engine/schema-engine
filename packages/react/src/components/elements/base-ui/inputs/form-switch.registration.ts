import { FormSwitch } from './form-switch';
import type { SwitchFieldConfig, SwitchFieldProps } from './form-switch.types';
import { SwitchFieldConfigSchema } from './form-switch.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			switch: SwitchFieldConfig;
		}
	}
}

export const SwitchElementRegistration: ElementRegistration<SwitchFieldConfig, SwitchFieldProps> = {
	$type: 'switch',
	render: FormSwitch,
	schema: SwitchFieldConfigSchema,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field for boolean values',
		category: 'input',
	},
};
