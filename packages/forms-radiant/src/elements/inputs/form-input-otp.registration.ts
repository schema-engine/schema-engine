import { FormInputOTP } from './form-input-otp';
import { InputOTPFieldConfigSchema } from './form-input-otp.types';
import { defineInput } from '@schema-engine/forms';

export const InputOTPElementRegistration = defineInput({
	$type: 'input-otp',
	render: FormInputOTP,
	schema: InputOTPFieldConfigSchema,
	metadata: {
		name: 'OTP Input',
		description: 'One-time password input with configurable length',
		category: 'input',
	},
});
