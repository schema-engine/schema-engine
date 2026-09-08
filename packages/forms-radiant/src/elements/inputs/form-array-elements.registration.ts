import { FormArrayElements } from './form-array-elements';
import { ArrayElementConfigSchema } from '@/registry/forms/inputs/form-array-elements.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			arrayElements: import('@/registry/forms/inputs/form-array-elements.types').ArrayElementsConfig;
		}
	}
}

export const ArrayElementRegistration = defineInput({
	$type: 'arrayElements',
	render: FormArrayElements,
	schema: ArrayElementConfigSchema,
	metadata: {
		name: 'Array Field',
		description: 'Dynamic array field for managing lists of repeatable form elements',
		category: 'input',
	},
});
