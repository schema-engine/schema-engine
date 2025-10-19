import { SubmitButton } from './submit-button';
import type { SubmitButtonConfig } from './submit-button.types';
import { SubmitButtonSchema } from './submit-button.types';
import type { InputRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			submit: SubmitButtonConfig;
		}
	}
}

export const SubmitButtonElementRegistration: InputRegistration<'submit', SubmitButtonConfig> = {
	$type: 'submit',
	render: SubmitButton,
	schema: SubmitButtonSchema,
	metadata: {
		name: 'Submit Button',
		description: 'Form submission button that handles submitting state',
		category: 'action',
	},
};
