import { PhoneInputElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { createRadiantPhoneValidationRegistration } from '../../lib/phone-validation.js';
import { FormPhoneInput } from './form-phone-input.js';

export const PhoneInputElementRegistration = {
	...PhoneInputElementContract,
	render: FormPhoneInput,
	validations: [createRadiantPhoneValidationRegistration()],
} as const satisfies ElementBinding<typeof PhoneInputElementContract>;
