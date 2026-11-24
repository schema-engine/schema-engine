import type { FormConfig } from '@schema-engine/forms';

/** A custom recipe shell: `view.$type` selects it and `view.shell` configures it. */
export const brandFrameForm: FormConfig = {
	id: 'brand-frame',
	view: { $type: 'brand-frame', shell: { label: 'Newsletter' } },
	steps: [
		{
			id: 'signup',
			title: 'Sign up',
			elements: [
				{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' },
				{ $type: 'submit', id: 'submit', name: 'submit', label: 'Subscribe' },
			],
		},
	],
};
