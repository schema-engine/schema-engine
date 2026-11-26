import { SubmitButton } from './submit-button';
import { SubmitButtonElementContract } from '@schema-engine/forms/elements';
import { defineStatic } from '@schema-engine/forms';

export const SubmitButtonElementRegistration = defineStatic({
	...SubmitButtonElementContract,
	render: SubmitButton,
});
