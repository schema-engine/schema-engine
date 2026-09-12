/**
 * Input Element Registration with Type Augmentation
 *
 * Import this file to register the input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { InputElementRegistration } from '@components/schema-engine/forms/inputs/form-input.registration';
 * import { createFormEngine } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   elements: [InputElementRegistration],
 * });
 * ```
 */

import { FormInput } from './form-input';
import type { InputFieldConfig } from './form-input.types';
import { InputFieldSchema } from './form-input.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
		}
	}
}

export const InputElementRegistration = defineInput({
	$type: 'input',
	render: FormInput,
	schema: InputFieldSchema,
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
});
