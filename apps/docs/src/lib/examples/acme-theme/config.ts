import type { FormConfig } from '@schema-engine/forms';

/** A form that picks values of two axes, under a host theme file. */
export const acmeForm: FormConfig = {
	id: 'acme-theme',
	title: 'Create an account',
	className: 'acme',
	view: { $type: 'card', shell: { appearance: { size: 'comfortable', surface: 'outlined' } } },
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{ $type: 'input', id: 'name', name: 'name', label: 'Name', grid: { width: 'half' } },
				{ $type: 'input', id: 'company', name: 'company', label: 'Company', grid: { width: 'half' } },
				{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' },
			],
		},
	],
};
