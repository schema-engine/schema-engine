import { FormSwitch } from './form-switch';
import type { SwitchFieldConfig, SwitchFieldProps } from '@/registry/forms/inputs/form-switch.types';
import { SwitchFieldConfigSchema } from '@/registry/forms/inputs/form-switch.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(SwitchFieldConfigSchema),
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch field',
		category: 'input',
	},
};
