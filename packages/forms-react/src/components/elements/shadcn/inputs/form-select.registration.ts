/**
 * Select Element Registration with Type Augmentation
 */

import { FormSelect } from './form-select';
import type { SelectFieldConfig, SelectFieldProps } from './form-select.types';
import { SelectFieldConfigSchema } from './form-select.types';
import type { InputRegistration } from '@schema-engine/forms/types';

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
	schema: SelectFieldConfigSchema,
	metadata: {
		name: 'Select Field',
		description: 'Dropdown select field for choosing from predefined options',
		category: 'input',
	},
};
