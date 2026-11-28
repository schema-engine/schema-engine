import { CheckboxElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormCheckbox } from './form-checkbox.js';

export const CheckboxElementRegistration = {
	...CheckboxElementContract,
	render: FormCheckbox,
} satisfies ElementBinding<typeof CheckboxElementContract>;
