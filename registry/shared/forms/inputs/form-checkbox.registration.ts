import { FormCheckbox } from './form-checkbox';
import { CheckboxElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const CheckboxElementRegistration = defineInput({
	...CheckboxElementContract,
	render: FormCheckbox,
});
