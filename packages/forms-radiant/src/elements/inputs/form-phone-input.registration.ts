import { defineInput } from '@schema-engine/forms';
import { PhoneInputElementContract } from '@schema-engine/forms/default-elements';
import { createRadiantPhoneValidationRegistration } from '../../lib/phone-validation.js';
import { FormPhoneInput } from './form-phone-input.js';

export const PhoneInputElementRegistration = defineInput({
	...PhoneInputElementContract,
	render: FormPhoneInput,
	validations: [createRadiantPhoneValidationRegistration()],
});
