import type { FormConfig } from '@schema-engine/forms';

/** Overriding the `size` axis hooks and tokens. */
export const tightForm: FormConfig = {
	id: 'tight-size',
	title: 'Compact form',
	className: 'tight-form',
	view: { $type: 'card', shell: { appearance: { size: 'compact' } } },
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [
				{ $type: 'input', id: 'name', name: 'name', label: 'Name' },
				{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' },
			],
		},
	],
};
