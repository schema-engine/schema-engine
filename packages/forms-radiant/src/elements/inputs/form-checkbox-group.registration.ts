import { defineInput } from '@schema-engine/forms';
import { CheckboxGroupElementContract } from '@schema-engine/forms/default-elements';
import { FormCheckboxGroup } from './form-checkbox-group.js';

export const CheckboxGroupElementRegistration = defineInput({
	...CheckboxGroupElementContract,
	render: FormCheckboxGroup,
});
