/**
 * Masked Input Element Registration with Type Augmentation
 *
 * Import this file to register the masked-input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { MaskedInputElementRegistration } from '@components/schema-engine/forms/inputs/form-masked-input.registration';
 * import { createFormEngine, defineInput } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   elements: [MaskedInputElementRegistration],
 * });
 * ```
 */

import { FormMaskedInput } from './form-masked-input';
import type { MaskedInputFieldConfig } from './form-masked-input.types';
import { MaskedInputFieldSchema } from './form-masked-input.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'masked-input': MaskedInputFieldConfig;
		}
	}
}

export const MaskedInputElementRegistration = defineInput({
	$type: 'masked-input',
	render: FormMaskedInput,
	schema: MaskedInputFieldSchema,
	metadata: {
		name: 'Masked Input Field',
		description: 'Text input with an iMask pattern for formatted values like IBAN, cards, and dates',
		category: 'input',
	},
});
