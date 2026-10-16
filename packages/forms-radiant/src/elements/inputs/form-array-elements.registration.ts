import { FormArrayElements } from './form-array-elements';
import { ArrayElementConfigSchema } from './form-array-elements.types';
import { defineInput } from '@schema-engine/forms';

export const ArrayElementRegistration = defineInput({
	$type: 'arrayElements',
	containerKind: 'array',
	render: FormArrayElements,
	schema: ArrayElementConfigSchema,
	metadata: {
		name: 'Array Field',
		description: 'Dynamic array field for managing lists of repeatable form elements',
		category: 'input',
	},
});
