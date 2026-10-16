import { FormInputOTP } from './form-input-otp';
import { InputOTPFieldConfigSchema } from './form-input-otp.types';
import { defineInput } from '@schema-engine/forms';

export const InputOTPElementRegistration = defineInput({
	$type: 'input-otp',
	render: FormInputOTP,
	schema: InputOTPFieldConfigSchema,
	metadata: {
		name: 'Input OTP Field',
		description: 'One-time password input field with multiple slots',
		category: 'input',
	},
});
