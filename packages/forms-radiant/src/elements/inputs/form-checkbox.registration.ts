import { defineInput } from '@schema-engine/forms';
import { CheckboxElementContract } from '@schema-engine/forms/default-elements';
import { FormCheckbox } from './form-checkbox.js';

export const CheckboxElementRegistration = defineInput({
	...CheckboxElementContract,
	render: FormCheckbox,
});
