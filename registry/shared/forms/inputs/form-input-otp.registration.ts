import { FormInputOTP } from './form-input-otp';
import { InputOTPElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const InputOTPElementRegistration = defineInput({
	...InputOTPElementContract,
	render: FormInputOTP,
});
