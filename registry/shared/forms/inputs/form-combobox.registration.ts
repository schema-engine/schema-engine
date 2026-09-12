import { FormCombobox } from './form-combobox';
import type { ComboboxFieldConfig } from './form-combobox.types';
import { ComboboxFieldConfigSchema } from './form-combobox.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			combobox: ComboboxFieldConfig;
		}
	}
}

export const ComboboxElementRegistration = defineInput({
	$type: 'combobox',
	render: FormCombobox,
	schema: ComboboxFieldConfigSchema,
	metadata: {
		name: 'Combobox Field',
		description: 'Searchable combobox field for choosing from multiple options with filtering support',
		category: 'input',
	},
});
