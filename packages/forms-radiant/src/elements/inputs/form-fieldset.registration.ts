import { FieldSetContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormFieldSet } from './form-fieldset.js';

export const FieldSetRegistration = {
	...FieldSetContract,
	render: FormFieldSet,
} satisfies ElementBinding<typeof FieldSetContract>;
