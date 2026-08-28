import { FormRadio } from './form-radio';
import type { RadioFieldConfig, RadioFieldProps } from '@/registry/forms/inputs/form-radio.types';
import { RadioFieldConfigSchema } from '@/registry/forms/inputs/form-radio.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(RadioFieldConfigSchema),
	metadata: {
		name: 'Radio Field',
		description: 'Radio button group field',
		category: 'input',
	},
};
