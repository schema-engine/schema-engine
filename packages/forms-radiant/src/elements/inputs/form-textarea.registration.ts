import { TextareaElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormTextarea } from './form-textarea.js';

export const TextareaElementRegistration = {
	...TextareaElementContract,
	render: FormTextarea,
} satisfies ElementBinding<typeof TextareaElementContract>;
