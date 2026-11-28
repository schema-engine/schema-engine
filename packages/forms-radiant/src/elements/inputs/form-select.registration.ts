import { SelectElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormSelect } from './form-select.js';

export const SelectElementRegistration = {
	...SelectElementContract,
	render: FormSelect,
} satisfies ElementBinding<typeof SelectElementContract>;
