import { FormCombobox } from './form-combobox';
import { ComboboxFieldConfigSchema } from './form-combobox.types';
import { defineInput } from '@schema-engine/forms';

export const ComboboxElementRegistration = defineInput({
	$type: 'combobox',
	render: FormCombobox,
	schema: ComboboxFieldConfigSchema,
	metadata: {
		name: 'Combobox Field',
		description: 'Searchable combobox field for choosing from options',
		category: 'input',
	},
});
