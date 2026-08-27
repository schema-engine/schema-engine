/**
 * Masked Input Element Registration with Type Augmentation
 *
 * Import this file to register the masked-input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { MaskedInputElementRegistration } from '@components/schema-engine/forms/inputs/form-masked-input.registration';
 * import { FormComposer } from '@schema-engine/forms/builder';
 *
 * const engine = new FormComposer()
 *   .addElement(MaskedInputElementRegistration)
 *   .build();
 * ```
 */

import { FormMaskedInput } from './form-masked-input';
import type { MaskedInputFieldConfig, MaskedInputFieldProps } from './form-masked-input.types';
import { MaskedInputFieldSchema } from './form-masked-input.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'masked-input': MaskedInputFieldConfig;
		}
	}
}

export const MaskedInputElementRegistration: InputRegistration<
	'masked-input',
	MaskedInputFieldConfig,
	MaskedInputFieldProps
> = {
	$type: 'masked-input',
	render: FormMaskedInput,
	schema: asStandardSchema(MaskedInputFieldSchema),
	metadata: {
		name: 'Masked Input Field',
		description: 'Text input with an iMask pattern for formatted values like IBAN, cards, and dates',
		category: 'input',
	},
};
