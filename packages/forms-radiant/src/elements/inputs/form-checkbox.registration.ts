import { FormCheckbox } from './form-checkbox';
import type { CheckboxFieldConfig, CheckboxFieldProps } from '@/registry/forms/inputs/form-checkbox.types';
import { CheckboxFieldConfigSchema } from '@/registry/forms/inputs/form-checkbox.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			checkbox: CheckboxFieldConfig;
		}
	}
}

export const CheckboxElementRegistration: InputRegistration<'checkbox', CheckboxFieldConfig, CheckboxFieldProps> = {
	$type: 'checkbox',
	render: FormCheckbox,
	schema: asStandardSchema(CheckboxFieldConfigSchema),
	metadata: {
		name: 'Checkbox Field',
		description: 'Single checkbox field',
		category: 'input',
	},
};
