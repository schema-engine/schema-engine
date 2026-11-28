import { defineInput } from '@schema-engine/forms';
import { NumberElementContract } from '@schema-engine/forms/default-elements';
import { FormNumber } from './form-number.js';

export const NumberElementRegistration = defineInput({
	...NumberElementContract,
	render: FormNumber,
});
