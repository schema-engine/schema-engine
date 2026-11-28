import { defineInput } from '@schema-engine/forms';
import { RadioElementContract } from '@schema-engine/forms/default-elements';
import { FormRadio } from './form-radio.js';

export const RadioElementRegistration = defineInput({
	...RadioElementContract,
	render: FormRadio,
});
