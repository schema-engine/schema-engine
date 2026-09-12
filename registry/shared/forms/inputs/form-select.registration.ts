import { FormSelect } from './form-select';
import type { SelectFieldConfig } from './form-select.types';
import { SelectFieldConfigSchema } from './form-select.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			select: SelectFieldConfig;
		}
	}
}

export const SelectElementRegistration = defineInput({
	$type: 'select',
	render: FormSelect,
	schema: SelectFieldConfigSchema,
	metadata: {
		name: 'Select Field',
		description: 'Dropdown select field for choosing from one or more options',
		category: 'input',
	},
});
