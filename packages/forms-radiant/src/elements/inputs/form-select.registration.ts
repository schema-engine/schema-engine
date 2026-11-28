import { defineInput } from '@schema-engine/forms';
import { SelectElementContract } from '@schema-engine/forms/default-elements';
import { FormSelect } from './form-select.js';

export const SelectElementRegistration = defineInput({
	...SelectElementContract,
	render: FormSelect,
});
