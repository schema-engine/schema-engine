import { InputOTPElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormInputOTP } from './form-input-otp.js';

export const InputOTPElementRegistration = {
	...InputOTPElementContract,
	render: FormInputOTP,
} satisfies ElementBinding<typeof InputOTPElementContract>;
