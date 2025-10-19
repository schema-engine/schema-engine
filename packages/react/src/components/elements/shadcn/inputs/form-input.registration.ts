/**
 * Input Element Registration with Type Augmentation
 *
 * Import this file to register the input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { InputElementRegistration } from '@json-form-engine/react/components/elements/shadcn/inputs/form-input.registration';
 * import { FormEngineBuilder } from '@json-form-engine/core/builder';
 *
 * const engine = new FormEngineBuilder()
 *   .addElement(InputElementRegistration)
 *   .build();
 * ```
 */

import { FormInput } from './form-input';
import type { InputFieldConfig, InputFieldProps } from './form-input.types';
import { InputFieldSchema } from './form-input.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			input: InputFieldConfig;
		}
	}
}

export const InputElementRegistration: ElementRegistration<InputFieldConfig, InputFieldProps> = {
	$type: 'input',
	render: FormInput,
	schema: InputFieldSchema,
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
};
