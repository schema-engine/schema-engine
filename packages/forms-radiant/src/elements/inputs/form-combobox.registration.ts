import { defineInput } from '@schema-engine/forms';
import { ComboboxElementContract } from '@schema-engine/forms/default-elements';
import { FormCombobox } from './form-combobox.js';

export const ComboboxElementRegistration = defineInput({
	...ComboboxElementContract,
	render: FormCombobox,
});
