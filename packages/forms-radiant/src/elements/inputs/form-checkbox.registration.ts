import { FormCheckbox } from './form-checkbox';
import { CheckboxFieldConfigSchema } from './form-checkbox.types';
import { defineInput } from '@schema-engine/forms';

export const CheckboxElementRegistration = defineInput({
	$type: 'checkbox',
	appearanceAxes: ['size'],
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		name: 'Checkbox Field',
		description: 'Single checkbox field',
		category: 'input',
	},
});
