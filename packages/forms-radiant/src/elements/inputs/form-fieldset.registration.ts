import { FormFieldSet } from './form-fieldset';
import { FieldSetConfigSchema } from './form-fieldset.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			fieldSet: import('./form-fieldset.types').FieldSetConfig;
		}
	}
}

export const FieldSetRegistration = defineInput({
	$type: 'fieldSet',
	render: FormFieldSet,
	schema: FieldSetConfigSchema,
	metadata: {
		name: 'FieldSet',
		description: 'Groups related form fields into a nested object structure',
		category: 'input',
	},
});
