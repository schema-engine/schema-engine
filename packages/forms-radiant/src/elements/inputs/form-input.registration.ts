import { defineInput } from '@schema-engine/forms';
import { InputElementContract } from '@schema-engine/forms/default-elements';
import { FormInput } from './form-input.js';

export const InputElementRegistration = defineInput({
	...InputElementContract,
	render: FormInput,
});
