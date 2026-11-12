import { FormCheckboxGroup } from './form-checkbox-group';
import { CheckboxGroupFieldConfigSchema } from './form-checkbox-group.types';
import { defineInput } from '@schema-engine/forms';

export const CheckboxGroupElementRegistration = defineInput({
	$type: 'checkbox-group',
	appearanceAxes: ['size'],
	render: FormCheckboxGroup,
	schema: CheckboxGroupFieldConfigSchema,
	metadata: {
		name: 'Checkbox Group Field',
		description: 'Multiple checkbox field for selecting multiple options',
		category: 'input',
	},
});
