/**
 * Array Elements Registration
 */

import { FormArrayElements } from './form-array-elements';
import { ArrayElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const ArrayElementRegistration = defineInput({
	...ArrayElementContract,
	render: FormArrayElements,
});
