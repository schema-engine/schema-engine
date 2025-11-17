import { FormRadio } from './form-radio';
import type { RadioFieldConfig, RadioFieldProps } from './form-radio.types';
import { RadioFieldConfigSchema } from './form-radio.types';
import type { InputRegistration } from '@schema-engine/forms/types';

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
		name: 'Radio Field',
		description: 'Radio button field for single selection from multiple options',
		category: 'input',
	},
};
