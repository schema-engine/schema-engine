import { defineInput } from '@schema-engine/forms';
import { TextareaElementContract } from '@schema-engine/forms/default-elements';
import { FormTextarea } from './form-textarea.js';

export const TextareaElementRegistration = defineInput({
	...TextareaElementContract,
	render: FormTextarea,
});
