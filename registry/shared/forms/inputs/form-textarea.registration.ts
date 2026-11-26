import { FormTextarea } from './form-textarea';
import { TextareaElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const TextareaElementRegistration = defineInput({
	...TextareaElementContract,
	render: FormTextarea,
});
