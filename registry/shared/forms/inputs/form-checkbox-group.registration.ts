import { FormCheckboxGroup } from './form-checkbox-group';
import { CheckboxGroupFieldConfigSchema, checkboxGroupFieldValue } from './form-checkbox-group.types';
import { defineInput } from '@schema-engine/forms';

export const CheckboxGroupElementRegistration = defineInput({
	$type: 'checkbox-group',
	appearanceAxes: ['size'],
	render: FormCheckboxGroup,
	schema: CheckboxGroupFieldConfigSchema,
	value: checkboxGroupFieldValue,
	metadata: {
		name: 'Checkbox Group Field',
		description: 'Multiple checkbox field for selecting multiple options',
		category: 'input',
	},
});
