import { FormCombobox } from './form-combobox';
import type { ComboboxFieldConfig } from '@/registry/forms/inputs/form-combobox.types';
import { ComboboxFieldConfigSchema } from '@/registry/forms/inputs/form-combobox.types';
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
		description: 'Searchable combobox field for choosing from options',
		category: 'input',
	},
});
