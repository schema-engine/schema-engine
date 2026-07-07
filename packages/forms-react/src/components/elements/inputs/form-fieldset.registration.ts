/**
 * FieldSet Registration with Type Augmentation
 */

import { FormFieldSet } from './form-fieldset';
import type { FieldSetConfig, FieldSetProps } from './form-fieldset.types';
import { FieldSetConfigSchema } from './form-fieldset.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			fieldSet: FieldSetConfig;
		}
	}
}

export const FieldSetRegistration: InputRegistration<'fieldSet', FieldSetConfig, FieldSetProps> = {
	$type: 'fieldSet',
	render: FormFieldSet,
	schema: asStandardSchema(FieldSetConfigSchema),
	metadata: {
		name: 'FieldSet',
		description: 'Groups related form fields into a nested object structure',
		category: 'input',
	},
};
