import { FormCheckbox } from './form-checkbox';
import { CheckboxElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const CheckboxElementRegistration = defineInput({
	...CheckboxElementContract,
	render: FormCheckbox,
});
