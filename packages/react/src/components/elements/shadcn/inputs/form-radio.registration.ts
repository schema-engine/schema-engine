/**
 * Radio Element Registration with Type Augmentation
 */

import { FormRadio } from './form-radio';
import type { RadioFieldConfig, RadioFieldProps } from './form-radio.types';
import { RadioFieldConfigSchema } from './form-radio.types';
import type { InputRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			radio: RadioFieldConfig;
		}
	}
}

export const RadioElementRegistration: InputRegistration<'radio', RadioFieldConfig, RadioFieldProps> = {
	$type: 'radio',
	render: FormRadio,
	schema: RadioFieldConfigSchema,
	metadata: {
		name: 'Radio Group Field',
		description: 'Radio button group for selecting one option from multiple choices',
		category: 'input',
	},
};
