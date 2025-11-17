/**
 * Array Elements Registration with Type Augmentation
 */

import { FormArrayElements } from './form-array-elements';
import type { ArrayElementsConfig, ArrayElementsProps } from './form-array-elements.types';
import { ArrayElementConfigSchema } from './form-array-elements.types';
import type { InputRegistration } from '@schema-engine/forms/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			arrayElements: ArrayElementsConfig;
		}
	}
}

export const ArrayElementRegistration: InputRegistration<'arrayElements', ArrayElementsConfig, ArrayElementsProps> = {
	$type: 'arrayElements',
	render: FormArrayElements,
	schema: ArrayElementConfigSchema,
	metadata: {
		name: 'Array Field',
		description: 'Dynamic array field for managing lists of repeatable form elements',
		category: 'input',
	},
};
