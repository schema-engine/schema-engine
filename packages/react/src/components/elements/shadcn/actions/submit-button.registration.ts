/**
 * Submit Button Element Registration with Type Augmentation
 */

import { SubmitButton } from './submit-button';
import { SubmitButtonSchema, type SubmitButtonProps } from './submit-button.types';
import type { SubmitButtonConfig } from './submit-button.types';
import type { InputRegistration } from '@json-form-engine/core';

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
	schema: SubmitButtonSchema,
	metadata: {
		name: 'Submit Button',
		description: 'A submit button that is aware of form submission state',
		category: 'action',
	},
};
