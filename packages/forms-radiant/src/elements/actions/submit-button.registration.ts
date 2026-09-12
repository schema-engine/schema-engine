import { SubmitButton } from './submit-button';
import type { SubmitButtonConfig } from '@/registry/forms/actions/submit-button.types';
import { SubmitButtonSchema } from '@/registry/forms/actions/submit-button.types';
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
		description: 'Form submit button',
		category: 'action',
	},
});
