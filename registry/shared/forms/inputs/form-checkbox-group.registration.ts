import { FormCheckboxGroup } from './form-checkbox-group';
import type { CheckboxGroupFieldConfig } from './form-checkbox-group.types';
import { CheckboxGroupFieldConfigSchema } from './form-checkbox-group.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'checkbox-group': CheckboxGroupFieldConfig;
		}
	}
}

export const CheckboxGroupElementRegistration = defineInput({
	$type: 'checkbox-group',
	render: FormCheckboxGroup,
	schema: CheckboxGroupFieldConfigSchema,
	metadata: {
		name: 'Checkbox Group Field',
		description: 'Multiple checkbox field for selecting multiple options',
		category: 'input',
	},
});
