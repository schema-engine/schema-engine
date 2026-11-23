import type { FormConfig } from '@schema-engine/forms';

const _defaultTextInput = {
	id: 'test-form',
	steps: [
		{
			id: 'step-1',
			title: 'Step 1',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
				},
			],
		},
	],
} satisfies FormConfig;

void _defaultTextInput;
