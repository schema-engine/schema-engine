import { FormCombobox } from './form-combobox';
import { ComboboxElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const ComboboxElementRegistration = defineInput({
	...ComboboxElementContract,
	render: FormCombobox,
});
