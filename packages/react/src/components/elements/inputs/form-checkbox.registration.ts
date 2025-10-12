/**
 * Checkbox Element Registration with Type Augmentation
 */

import { FormCheckbox } from './form-checkbox';
import type { CheckboxFieldConfig, CheckboxFieldProps } from './form-checkbox.types';
import { CheckboxFieldConfigSchema } from './form-checkbox.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			checkbox: CheckboxFieldConfig;
		}
	}
}

export const CheckboxElementRegistration: ElementRegistration<CheckboxFieldConfig, CheckboxFieldProps> = {
	__id: 'checkbox',
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		name: 'Checkbox Field',
		description: 'Single checkbox input for boolean values',
		category: 'input',
	},
};
