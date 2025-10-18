import { FormSelect } from './form-select';
import type { SelectFieldConfig, SelectFieldProps } from './form-select.types';
import { SelectFieldConfigSchema } from './form-select.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			select: SelectFieldConfig;
		}
	}
}

export const SelectElementRegistration: ElementRegistration<SelectFieldConfig, SelectFieldProps> = {
	__id: 'select',
	render: FormSelect,
	schema: SelectFieldConfigSchema,
	metadata: {
		name: 'Select Field',
		description: 'Dropdown select field for choosing from multiple options',
		category: 'input',
	},
};
