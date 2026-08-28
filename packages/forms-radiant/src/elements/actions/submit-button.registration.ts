import { SubmitButton } from './submit-button';
import type { SubmitButtonConfig, SubmitButtonProps } from '@/registry/forms/actions/submit-button.types';
import { SubmitButtonSchema } from '@/registry/forms/actions/submit-button.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			submit: SubmitButtonConfig;
		}
	}
}

export const SubmitButtonElementRegistration: InputRegistration<'submit', SubmitButtonConfig, SubmitButtonProps> = {
	$type: 'submit',
	render: SubmitButton,
	schema: asStandardSchema(SubmitButtonSchema),
	metadata: {
		name: 'Submit Button',
		description: 'Form submit button',
		category: 'action',
	},
};
