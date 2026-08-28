import { FormSelect } from './form-select';
import type { SelectFieldConfig, SelectFieldProps } from '@/registry/forms/inputs/form-select.types';
import { SelectFieldConfigSchema } from '@/registry/forms/inputs/form-select.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			select: SelectFieldConfig;
		}
	}
}

export const SelectElementRegistration: InputRegistration<'select', SelectFieldConfig, SelectFieldProps> = {
	$type: 'select',
	render: FormSelect,
	schema: asStandardSchema(SelectFieldConfigSchema),
	metadata: {
		name: 'Select Field',
		description: 'Dropdown select field',
		category: 'input',
	},
};
