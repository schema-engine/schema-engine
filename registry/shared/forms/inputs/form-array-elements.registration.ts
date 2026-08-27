/**
 * Array Elements Registration with Type Augmentation
 */

import { FormArrayElements } from './form-array-elements';
import type { ArrayElementsConfig } from './form-array-elements.types';
import { ArrayElementConfigSchema } from './form-array-elements.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			arrayElements: ArrayElementsConfig;
		}
	}
}

export const ArrayElementRegistration: InputRegistration<'arrayElements', ArrayElementsConfig> = {
	$type: 'arrayElements',
	render: FormArrayElements,
	schema: asStandardSchema(ArrayElementConfigSchema),
	metadata: {
		name: 'Array Field',
		description: 'Dynamic array field for managing lists of repeatable form elements',
		category: 'input',
	},
};
