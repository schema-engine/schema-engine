/**
 * FieldSet Registration
 */

import { FormFieldSet } from './form-fieldset';
import { FieldSetConfigSchema } from './form-fieldset.types';
import { defineInput } from '@schema-engine/forms';

export const FieldSetRegistration = defineInput({
	$type: 'fieldSet',
	appearanceAxes: ['size'],
	render: FormFieldSet,
	schema: FieldSetConfigSchema,
	metadata: {
		name: 'FieldSet',
		description: 'Groups related form fields into a nested object structure',
		category: 'input',
	},
});
