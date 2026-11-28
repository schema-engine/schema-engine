import { defineInput } from '@schema-engine/forms';
import { ArrayElementContract } from '@schema-engine/forms/default-elements';
import { FormArrayElements } from './form-array-elements.js';

export const ArrayElementRegistration = defineInput({
	...ArrayElementContract,
	render: FormArrayElements,
});
