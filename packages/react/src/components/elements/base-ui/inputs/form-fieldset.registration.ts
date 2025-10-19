/**
 * FieldSet Registration with Type Augmentation
 */

import { FormFieldSet } from './form-fieldset';
import type { FieldSetConfig, FieldSetProps } from './form-fieldset.types';
import { FieldSetConfigSchema } from './form-fieldset.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			fieldSet: FieldSetConfig;
		}
	}
}

export const FieldSetRegistration: ElementRegistration<FieldSetConfig, FieldSetProps> = {
	$type: 'fieldSet',
	render: FormFieldSet,
	schema: FieldSetConfigSchema,
	metadata: {
		name: 'FieldSet',
		description: 'Groups related form fields into a nested object structure',
		category: 'input',
	},
};
