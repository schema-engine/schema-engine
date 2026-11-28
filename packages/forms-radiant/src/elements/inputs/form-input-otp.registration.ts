import { defineInput } from '@schema-engine/forms';
import { InputOTPElementContract } from '@schema-engine/forms/default-elements';
import { FormInputOTP } from './form-input-otp.js';

export const InputOTPElementRegistration = defineInput({
	...InputOTPElementContract,
	render: FormInputOTP,
});
