import { FormInputOTP } from './form-input-otp';
import { InputOTPFieldConfigSchema, inputOTPFieldValue } from './form-input-otp.types';
import { defineInput } from '@schema-engine/forms';

export const InputOTPElementRegistration = defineInput({
	$type: 'input-otp',
	appearanceAxes: ['size'],
	render: FormInputOTP,
	schema: InputOTPFieldConfigSchema,
	value: inputOTPFieldValue,
	metadata: {
		name: 'Input OTP Field',
		description: 'One-time password input field with multiple slots',
		category: 'input',
	},
});
