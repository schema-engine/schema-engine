import { FormInputOTP } from './form-input-otp';
import type { InputOTPFieldConfig, InputOTPFieldProps } from './form-input-otp.types';
import { InputOTPFieldConfigSchema } from './form-input-otp.types';
import type { InputRegistration } from '@schema-engine/forms/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'input-otp': InputOTPFieldConfig;
		}
	}
}

export const InputOTPElementRegistration: InputRegistration<'input-otp', InputOTPFieldConfig, InputOTPFieldProps> = {
	$type: 'input-otp',
	render: FormInputOTP,
	schema: InputOTPFieldConfigSchema,
	metadata: {
		name: 'Input OTP Field',
		description: 'One-time password input field with multiple slots',
		category: 'input',
	},
};
