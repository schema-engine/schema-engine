import { FormPhoneInput } from './form-phone-input';
import { PhoneInputFieldSchema, phoneInputFieldValue } from './form-phone-input.types';
import { createRadiantPhoneValidationRegistration } from '@/lib/phone-validation';
import { defineInput } from '@schema-engine/forms';

export { createRadiantPhoneValidationRegistration };

export const PhoneInputElementRegistration = defineInput({
	$type: 'phone-input',
	appearanceAxes: ['size'],
	render: FormPhoneInput,
	schema: PhoneInputFieldSchema,
	value: phoneInputFieldValue,
	validations: [createRadiantPhoneValidationRegistration()],
	metadata: {
		name: 'Phone Input',
		description: 'Telephone input field',
		category: 'input',
	},
});
