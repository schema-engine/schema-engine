/**
 * Submit Button Element Registration with Type Augmentation
 */

import { SubmitButton } from './submit-button';
import { SubmitButtonSchema } from './submit-button.types';
import type { SubmitButtonConfig, SubmitButtonProps } from './submit-button.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			submit: SubmitButtonConfig;
		}
	}
}

export const SubmitButtonElementRegistration: ElementRegistration<SubmitButtonConfig, SubmitButtonProps> = {
	$type: 'submit',
	render: SubmitButton,
	schema: SubmitButtonSchema,
	metadata: {
		name: 'Submit Button',
		description: 'A submit button that is aware of form submission state',
		category: 'action',
	},
};
