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
import type { PhoneInputFieldConfig } from './form-phone-input.types';
import { PhoneInputFieldSchema } from './form-phone-input.types';
import { createPhoneValidationRegistration } from './form-phone-input.validation';
import { defineInput } from '@schema-engine/forms';

export { createPhoneValidationRegistration };

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'phone-input': PhoneInputFieldConfig;
		}
	}
}

export const PhoneInputElementRegistration = defineInput({
	$type: 'phone-input',
	render: FormPhoneInput,
	schema: PhoneInputFieldSchema,
	validations: [createPhoneValidationRegistration()],
	metadata: {
		name: 'Phone Number Input Field',
		description: 'International phone number input with country selection',
		category: 'input',
	},
});
