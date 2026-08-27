/**
 * Input Element Registration with Type Augmentation
 *
 * Import this file to register the input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { InputElementRegistration } from '@components/schema-engine/forms/inputs/form-input.registration';
 * import { FormComposer } from '@schema-engine/forms/builder';
 *
 * const engine = new FormComposer()
 *   .addElement(InputElementRegistration)
 *   .build();
 * ```
 */

import { FormInput } from './form-input';
import type { InputFieldConfig, InputFieldProps } from './form-input.types';
import { InputFieldSchema } from './form-input.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
		}
	}
}

export const InputElementRegistration: InputRegistration<'input', InputFieldConfig, InputFieldProps> = {
	$type: 'input',
	render: FormInput,
	schema: asStandardSchema(InputFieldSchema),
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
};
