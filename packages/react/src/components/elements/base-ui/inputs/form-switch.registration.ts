import { FormSwitch } from './form-switch';
import type { SwitchFieldConfig, SwitchFieldProps } from './form-switch.types';
import { SwitchFieldConfigSchema } from './form-switch.types';
import type { InputRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			switch: SwitchFieldConfig;
		}
	}
}

export const SwitchElementRegistration: InputRegistration<'switch', SwitchFieldConfig, SwitchFieldProps> = {
	$type: 'switch',
	render: FormSwitch,
	schema: SwitchFieldConfigSchema,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field for boolean values',
		category: 'input',
	},
};
