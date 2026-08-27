import { FormCheckboxGroup } from './form-checkbox-group';
import type { CheckboxGroupFieldConfig, CheckboxGroupFieldProps } from './form-checkbox-group.types';
import { CheckboxGroupFieldConfigSchema } from './form-checkbox-group.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'checkbox-group': CheckboxGroupFieldConfig;
		}
	}
}

export const CheckboxGroupElementRegistration: InputRegistration<
	'checkbox-group',
	CheckboxGroupFieldConfig,
	CheckboxGroupFieldProps
> = {
	$type: 'checkbox-group',
	render: FormCheckboxGroup,
	schema: asStandardSchema(CheckboxGroupFieldConfigSchema),
	metadata: {
		name: 'Checkbox Group Field',
		description: 'Multiple checkbox field for selecting multiple options',
		category: 'input',
	},
};
