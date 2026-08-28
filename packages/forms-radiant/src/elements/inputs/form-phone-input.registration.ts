import { FormPhoneInput } from './form-phone-input';
import type { PhoneInputFieldConfig, PhoneInputFieldProps } from '@/registry/forms/inputs/form-phone-input.types';
import { PhoneInputFieldSchema } from '@/registry/forms/inputs/form-phone-input.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'phone-input': PhoneInputFieldConfig;
		}
	}
}

export const PhoneInputElementRegistration: InputRegistration<
	'phone-input',
	PhoneInputFieldConfig,
	PhoneInputFieldProps
> = {
	$type: 'phone-input',
	render: FormPhoneInput,
	schema: asStandardSchema(PhoneInputFieldSchema),
	metadata: {
		name: 'Phone Input',
		description: 'Telephone input field',
		category: 'input',
	},
};
