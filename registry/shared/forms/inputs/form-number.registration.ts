import { FormNumber } from './form-number';
import { NumberElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const NumberElementRegistration = defineInput({
	...NumberElementContract,
	render: FormNumber,
});
