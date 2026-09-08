import { FormSelect } from './form-select';
import type { SelectFieldConfig } from '@/registry/forms/inputs/form-select.types';
import { SelectFieldConfigSchema } from '@/registry/forms/inputs/form-select.types';
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
		description: 'Dropdown select field',
		category: 'input',
	},
});
