import { defineStatic } from '@schema-engine/forms';
import { SubmitButtonElementContract } from '@schema-engine/forms/default-elements';
import { SubmitButton } from './submit-button.js';

export const SubmitButtonElementRegistration = defineStatic({
	...SubmitButtonElementContract,
	render: SubmitButton,
});
