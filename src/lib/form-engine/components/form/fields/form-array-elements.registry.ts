import { defaultFormFieldRegistry } from '@/lib/form-engine/schemas/registry';
import { FormArrayElements } from './form-array-elements';
import { ArrayElementsExtensionSchema, type ArrayElementsConfig } from './form-array-elements.types';

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
		},
		{
			componentId: 'select',
			id: 'skillLevel',
			name: 'skillLevel',
			label: 'Skill Level',
			placeholder: 'Select level...',
			//@ts-expect-error Need to fix typing, elements should be defined and test at compiletime
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
 * Register array field with compile-time type safety
 * Uses explicit TypeScript types instead of z.infer for strict compile-time checking
 */

defaultFormFieldRegistry.register({
	componentId: 'arrayElements',
	component: FormArrayElements,
	runtimeSchema: ArrayElementsExtensionSchema,
	serializableSchema: ArrayElementsExtensionSchema,
	metadata: {
		title: 'Array Field',
		description: 'Dynamic array field for repeating elements with compile-time type safety',
		category: 'layout',
		example: arrayElementsExample,
	},
});
