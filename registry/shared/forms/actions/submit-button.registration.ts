import { SubmitButton } from './submit-button';
import type { SubmitButtonConfig } from './submit-button.types';
import { SubmitButtonSchema } from './submit-button.types';
import { defineStatic } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			submit: SubmitButtonConfig;
		}
	}
}

export const SubmitButtonElementRegistration = defineStatic({
	$type: 'submit',
	render: SubmitButton,
	schema: SubmitButtonSchema,
	metadata: {
		name: 'Submit Button',
		description: 'Form submission button that handles submitting state',
		category: 'action',
	},
});
