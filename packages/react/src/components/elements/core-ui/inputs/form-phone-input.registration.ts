/**
 * Phone Input Element Registration with Type Augmentation
 *
 * Import this file to register the phone input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { PhoneInputElementRegistration } from '@json-form-engine/react/components/core-ui/inputs/form-phone-input.registration';
 * import { FormEngineBuilder } from '@json-form-engine/core/builder';
 *
 * const engine = new FormEngineBuilder()
 *   .addElement(PhoneInputElementRegistration)
 *   .build();
 * ```
 */

import { FormPhoneInput } from './form-phone-input';
import type { PhoneInputFieldConfig, PhoneInputFieldProps } from './form-phone-input.types';
import { PhoneInputFieldSchema } from './form-phone-input.types';
import type { InputRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'phone-input': PhoneInputFieldConfig;
		}
	}
}

export const PhoneInputElementRegistration: InputRegistration<
	'phone-input',
	PhoneInputFieldConfig,
	PhoneInputFieldProps
> = {
	$type: 'phone-input',
	render: FormPhoneInput,
	schema: PhoneInputFieldSchema,
	metadata: {
		name: 'Phone Number Input Field',
		description: 'International phone number input with country selection',
		category: 'input',
	},
};
