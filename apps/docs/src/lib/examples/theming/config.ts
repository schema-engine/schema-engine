import type { FormConfig } from '@schema-engine/forms';

/**
 * A form that picks values of three axes and carries the class its stylesheet is scoped by.
 *
 * @remarks
 * The config only names what it wants: `tone` is the host axis of `theme.ts`, `size` and `surface` are built in. What
 * each name means is decided by the theme and by `themed.css`, so the same config looks different under another theme.
 */
export const themedForm: FormConfig = {
	id: 'themed',
	title: 'Create an account',
	className: 'themed',
	appearance: { tone: 'brand' },
	view: { $type: 'card', shell: { appearance: { size: 'compact', surface: 'outlined' } } },
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{ $type: 'input', id: 'first', name: 'first', label: 'First name', grid: { width: 'half' } },
				{ $type: 'input', id: 'last', name: 'last', label: 'Last name', grid: { width: 'half' } },
				{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' },
				{ $type: 'submit', id: 'create', name: 'create', label: 'Create account' },
			],
		},
	],
};
