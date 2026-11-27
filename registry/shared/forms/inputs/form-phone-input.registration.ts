/**
 * Phone Input Element Registration with Type Augmentation
 *
 * Import this file to register the phone input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { PhoneInputElementRegistration } from '@components/schema-engine/forms/inputs/form-phone-input.registration';
 * import { createFormEngine, defineInput } from '@schema-engine/forms';
 * const engine = createFormEngine({
 *   elements: [PhoneInputElementRegistration],
 * });
 * ```
 */

import { FormPhoneInput } from './form-phone-input';
import { createPhoneValidationRegistration } from './form-phone-input.validation';
import { PhoneInputElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export { createPhoneValidationRegistration };

export const PhoneInputElementRegistration = defineInput({
	...PhoneInputElementContract,
	render: FormPhoneInput,
	validations: [createPhoneValidationRegistration()],
});
