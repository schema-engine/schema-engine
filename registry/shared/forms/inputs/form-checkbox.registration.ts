import { FormCheckbox } from './form-checkbox';
import { CheckboxFieldConfigSchema } from './form-checkbox.types';
import { defineInput } from '@schema-engine/forms';

export const CheckboxElementRegistration = defineInput({
	$type: 'checkbox',
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		name: 'Checkbox Field',
		description: 'Checkbox input field for boolean values',
		category: 'input',
	},
});
