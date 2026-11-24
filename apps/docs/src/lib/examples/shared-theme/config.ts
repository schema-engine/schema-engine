import type { FormConfig } from '@schema-engine/forms';

/** Two forms for two engines that share one theme. */
export const checkoutForm: FormConfig = {
	id: 'checkout-theme',
	title: 'Checkout',
	appearance: { tone: 'brand' },
	view: { $type: 'card', shell: { appearance: { size: 'compact' } } },
	steps: [
		{
			id: 'contact',
			title: 'Contact',
			elements: [{ $type: 'input', id: 'email', name: 'email', label: 'Email', inputType: 'email' }],
		},
	],
};

export const profileForm: FormConfig = {
	id: 'profile-theme',
	title: 'Profile',
	appearance: { tone: 'forest' },
	view: { $type: 'card', shell: { appearance: { size: 'compact' } } },
	steps: [
		{
			id: 'name',
			title: 'Name',
			elements: [{ $type: 'input', id: 'display', name: 'display', label: 'Display name' }],
		},
	],
};
