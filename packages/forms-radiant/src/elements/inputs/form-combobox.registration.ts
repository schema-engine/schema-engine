import { FormCombobox } from './form-combobox';
import { ComboboxFieldConfigSchema, comboboxFieldValue } from './form-combobox.types';
import { defineInput } from '@schema-engine/forms';

export const ComboboxElementRegistration = defineInput({
	$type: 'combobox',
	appearanceAxes: ['size'],
	render: FormCombobox,
	schema: ComboboxFieldConfigSchema,
	value: comboboxFieldValue,
	metadata: {
		name: 'Combobox Field',
		description: 'Searchable combobox field for choosing from options',
		category: 'input',
	},
});
