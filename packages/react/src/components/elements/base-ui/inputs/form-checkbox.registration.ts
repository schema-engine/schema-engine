import { FormCheckbox } from './form-checkbox';
import type { CheckboxFieldConfig, CheckboxFieldProps } from './form-checkbox.types';
import { CheckboxFieldConfigSchema } from './form-checkbox.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			checkbox: CheckboxFieldConfig;
		}
	}
}

export const CheckboxElementRegistration: ElementRegistration<CheckboxFieldConfig, CheckboxFieldProps> = {
	$type: 'checkbox',
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		name: 'Checkbox Field',
		description: 'Checkbox input field for boolean values',
		category: 'input',
	},
};
