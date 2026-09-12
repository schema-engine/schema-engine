import { FormCheckbox } from './form-checkbox';
import type { CheckboxFieldConfig } from '@/registry/forms/inputs/form-checkbox.types';
import { CheckboxFieldConfigSchema } from '@/registry/forms/inputs/form-checkbox.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			checkbox: CheckboxFieldConfig;
		}
	}
}

export const CheckboxElementRegistration = defineInput({
	$type: 'checkbox',
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		name: 'Checkbox Field',
		description: 'Single checkbox field',
		category: 'input',
	},
});
