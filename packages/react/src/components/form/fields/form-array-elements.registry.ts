import { defaultFormFieldRegistry } from '@json-form-engine/core/schemas/registry';
import { FormArrayElements } from './form-array-elements';
import { createArrayElementsRuntimeSchema, type ArrayElementsConfig } from './form-array-elements.types';

export const arrayElementsExample: ArrayElementsConfig = {
	componentId: 'arrayElements',
	id: 'skills',
	name: 'skills',
	label: 'Skills',
	description: 'Add your skills',
	elements: [
		{
			componentId: 'input',
			id: 'skill',
			name: 'skill',
			label: 'Skill Name',
			placeholder: 'Enter skill...',
			inputType: 'text',
		},
		{
			componentId: 'select',
			id: 'skillLevel',
			name: 'skillLevel',
			label: 'Skill Level',
			placeholder: 'Select level...',
			options: [
				{ value: 'beginner', label: 'Beginner' },
				{ value: 'intermediate', label: 'Intermediate' },
				{ value: 'advanced', label: 'Advanced' },
			],
		},
	],
	addButtonText: 'Add Skill',
	removeButtonText: 'Remove',
	minItems: 0,
	maxItems: 10,
};

/**
 * Register array elements field component with enhanced type system
 * Uses static serializable schema for consistency
 */
export const arrayElementsFieldRegistration: FormEngine.FieldRegistration = {
	componentId: 'arrayElements',
	component: FormArrayElements,
	schema: createArrayElementsRuntimeSchema(defaultFormFieldRegistry),
	metadata: {
		title: 'Array Field',
		description: 'Dynamic array field for repeating elements with compile-time type safety',
		category: 'layout',
		example: arrayElementsExample,
	},
};

defaultFormFieldRegistry.register(arrayElementsFieldRegistration);
