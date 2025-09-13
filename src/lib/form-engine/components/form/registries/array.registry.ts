import { defaultFormRegistry } from '../../..';
import { ArrayField } from '../fields/array-field';

/**
 * Register array field component
 * Tree-shakable: Only imported when needed
 */
export function registerArrayField() {
	defaultFormRegistry.register({
		componentId: 'array',
		component: ArrayField,
		category: 'layout',
		description: 'Dynamic array field for repeating elements',
		example: {
			type: 'array',
			id: 'example-array',
			name: 'example',
			label: 'Example Array',
			elements: [
				{
					type: 'input',
					inputType: 'text',
					id: 'array-item',
					name: 'item',
					label: 'Array Item',
					placeholder: 'Enter item...',
				},
			],
			addButtonText: 'Add Item',
			removeButtonText: 'Remove',
		},
	});
}

// Auto-register when imported
registerArrayField();
