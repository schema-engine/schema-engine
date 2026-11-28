import { CheckboxGroupElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormCheckboxGroup } from './form-checkbox-group.js';

export const CheckboxGroupElementRegistration = {
	...CheckboxGroupElementContract,
	render: FormCheckboxGroup,
} satisfies ElementBinding<typeof CheckboxGroupElementContract>;
