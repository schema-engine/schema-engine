import { FormSelect } from './form-select';
import { SelectFieldConfigSchema } from './form-select.types';
import { defineInput } from '@schema-engine/forms';

export const SelectElementRegistration = defineInput({
	$type: 'select',
	appearanceAxes: ['size'],
	render: FormSelect,
	schema: SelectFieldConfigSchema,
	metadata: {
		name: 'Select Field',
		description: 'Dropdown select field for choosing from one or more options',
		category: 'input',
	},
});
