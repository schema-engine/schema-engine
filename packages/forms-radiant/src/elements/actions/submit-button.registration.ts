import { SubmitButton } from './submit-button';
import { SubmitButtonSchema } from './submit-button.types';
import { defineStatic } from '@schema-engine/forms';

export const SubmitButtonElementRegistration = defineStatic({
	$type: 'submit',
	render: SubmitButton,
	schema: SubmitButtonSchema,
	metadata: {
		name: 'Submit Button',
		description: 'Form submit button',
		category: 'action',
	},
});
