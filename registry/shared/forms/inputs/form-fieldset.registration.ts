/**
 * FieldSet Registration
 */

import { FormFieldSet } from './form-fieldset';
import { FieldSetContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const FieldSetRegistration = defineInput({
	...FieldSetContract,
	render: FormFieldSet,
});
