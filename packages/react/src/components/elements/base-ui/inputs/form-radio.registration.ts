import { FormRadio } from './form-radio';
import type { RadioFieldConfig, RadioFieldProps } from './form-radio.types';
import { RadioFieldConfigSchema } from './form-radio.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			radio: RadioFieldConfig;
		}
	}
}

export const RadioElementRegistration: ElementRegistration<RadioFieldConfig, RadioFieldProps> = {
	__id: 'radio',
	render: FormRadio,
	schema: RadioFieldConfigSchema,
	metadata: {
		name: 'Radio Field',
		description: 'Radio button field for single selection from multiple options',
		category: 'input',
	},
};
