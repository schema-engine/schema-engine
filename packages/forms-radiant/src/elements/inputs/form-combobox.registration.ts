import { ComboboxElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormCombobox } from './form-combobox.js';

export const ComboboxElementRegistration = {
	...ComboboxElementContract,
	render: FormCombobox,
} satisfies ElementBinding<typeof ComboboxElementContract>;
