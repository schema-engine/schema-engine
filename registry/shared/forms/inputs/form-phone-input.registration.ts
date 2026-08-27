/**
 * Phone Input Element Registration with Type Augmentation
 *
 * Import this file to register the phone input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { PhoneInputElementRegistration } from '@components/schema-engine/forms/inputs/form-phone-input.registration';
 * import { FormComposer } from '@schema-engine/forms/builder';
 *
 * const engine = new FormComposer()
 *   .addElement(PhoneInputElementRegistration)
 *   .build();
 * ```
 */

import { FormPhoneInput } from './form-phone-input';
import type { PhoneInputFieldConfig, PhoneInputFieldProps } from './form-phone-input.types';
import { PhoneInputFieldSchema } from './form-phone-input.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(PhoneInputFieldSchema),
	metadata: {
		name: 'Phone Number Input Field',
		description: 'International phone number input with country selection',
		category: 'input',
	},
};
