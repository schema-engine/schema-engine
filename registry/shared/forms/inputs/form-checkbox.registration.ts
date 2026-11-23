import { FormCheckbox } from './form-checkbox';
import { CheckboxFieldConfigSchema, checkboxFieldValue } from './form-checkbox.types';
import { defineInput } from '@schema-engine/forms';

export const CheckboxElementRegistration = defineInput({
	$type: 'checkbox',
	appearanceAxes: ['size'],
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	value: checkboxFieldValue,
	metadata: {
		name: 'Checkbox Field',
		description: 'Checkbox input field for boolean values',
		category: 'input',
	},
});
