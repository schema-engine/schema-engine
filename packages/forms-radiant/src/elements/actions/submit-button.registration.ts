import { SubmitButtonElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { SubmitButton } from './submit-button.js';

export const SubmitButtonElementRegistration = {
	...SubmitButtonElementContract,
	render: SubmitButton,
} satisfies ElementBinding<typeof SubmitButtonElementContract>;
