import { MaskedInputElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormMaskedInput } from './form-masked-input.js';

export const MaskedInputElementRegistration = {
	...MaskedInputElementContract,
	render: FormMaskedInput,
} satisfies ElementBinding<typeof MaskedInputElementContract>;
