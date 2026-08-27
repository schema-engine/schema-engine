import { FormCombobox } from './form-combobox';
import type { ComboboxFieldConfig, ComboboxFieldProps } from './form-combobox.types';
import { ComboboxFieldConfigSchema } from './form-combobox.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			combobox: ComboboxFieldConfig;
		}
	}
}

export const ComboboxElementRegistration: InputRegistration<'combobox', ComboboxFieldConfig, ComboboxFieldProps> = {
	$type: 'combobox',
	render: FormCombobox,
	schema: asStandardSchema(ComboboxFieldConfigSchema),
	metadata: {
		name: 'Combobox Field',
		description: 'Searchable combobox field for choosing from multiple options with filtering support',
		category: 'input',
	},
};
