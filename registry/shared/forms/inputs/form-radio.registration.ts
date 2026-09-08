import { FormRadio } from './form-radio';
import type { RadioFieldConfig } from './form-radio.types';
import { RadioFieldConfigSchema } from './form-radio.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			radio: RadioFieldConfig;
		}
	}
}

export const RadioElementRegistration = defineInput({
	$type: 'radio',
	render: FormRadio,
	schema: RadioFieldConfigSchema,
	metadata: {
		name: 'Radio Field',
		description: 'Radio button field for single selection from multiple options',
		category: 'input',
	},
});
