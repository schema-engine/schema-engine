import { FormRadio } from './form-radio';
import { RadioElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const RadioElementRegistration = defineInput({
	...RadioElementContract,
	render: FormRadio,
});
