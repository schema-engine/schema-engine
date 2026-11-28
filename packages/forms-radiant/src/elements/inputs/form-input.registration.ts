import { InputElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormInput } from './form-input.js';

export const InputElementRegistration = {
	...InputElementContract,
	render: FormInput,
} satisfies ElementBinding<typeof InputElementContract>;
