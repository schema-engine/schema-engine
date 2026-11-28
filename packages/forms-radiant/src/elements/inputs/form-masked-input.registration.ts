import { defineInput } from '@schema-engine/forms';
import { MaskedInputElementContract } from '@schema-engine/forms/default-elements';
import { FormMaskedInput } from './form-masked-input.js';

export const MaskedInputElementRegistration = defineInput({
	...MaskedInputElementContract,
	render: FormMaskedInput,
});
