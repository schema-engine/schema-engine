import { FormSelect } from './form-select';
import { SelectElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const SelectElementRegistration = defineInput({
	...SelectElementContract,
	render: FormSelect,
});
