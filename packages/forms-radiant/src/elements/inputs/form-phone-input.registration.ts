import { FormPhoneInput } from './form-phone-input';
import type { PhoneInputFieldConfig } from '@/registry/forms/inputs/form-phone-input.types';
import { PhoneInputFieldSchema } from '@/registry/forms/inputs/form-phone-input.types';
import { createRadiantPhoneValidationRegistration } from '@/lib/phone-validation';
import { defineInput } from '@schema-engine/forms';

export { createRadiantPhoneValidationRegistration };

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'phone-input': PhoneInputFieldConfig;
		}
	}
}

export const PhoneInputElementRegistration = defineInput({
	$type: 'phone-input',
	render: FormPhoneInput,
	schema: PhoneInputFieldSchema,
	validations: [createRadiantPhoneValidationRegistration()],
	metadata: {
		name: 'Phone Input',
		description: 'Telephone input field',
		category: 'input',
	},
});
