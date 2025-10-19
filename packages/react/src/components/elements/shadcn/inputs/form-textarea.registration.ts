/**
 * Textarea Element Registration with Type Augmentation
 *
 * Import this file to register the textarea element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { TextareaElementRegistration } from '@json-form-engine/react/components/elements/inputs/form-textarea.registration';
 * import { FormEngineBuilder } from '@json-form-engine/core/builder';
 *
 * const engine = new FormEngineBuilder()
 *   .addElement(TextareaElementRegistration)
 *   .build();
 * ```
 */

import { FormTextarea } from './form-textarea';
import type { TextareaFieldConfig, TextareaFieldProps } from './form-textarea.types';
import { TextareaFieldSchema } from './form-textarea.types';
import type { InputRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			textarea: TextareaFieldConfig;
		}
	}
}

export const TextareaElementRegistration: InputRegistration<'textarea', TextareaFieldConfig, TextareaFieldProps> = {
	$type: 'textarea',
	render: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
};
