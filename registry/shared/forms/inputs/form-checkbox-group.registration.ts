import { FormCheckboxGroup } from './form-checkbox-group';
import { CheckboxGroupElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const CheckboxGroupElementRegistration = defineInput({
	...CheckboxGroupElementContract,
	render: FormCheckboxGroup,
});
