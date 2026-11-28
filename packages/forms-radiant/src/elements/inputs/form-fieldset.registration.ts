import { defineInput } from '@schema-engine/forms';
import { FieldSetContract } from '@schema-engine/forms/default-elements';
import { FormFieldSet } from './form-fieldset.js';

export const FieldSetRegistration = defineInput({
	...FieldSetContract,
	render: FormFieldSet,
});
