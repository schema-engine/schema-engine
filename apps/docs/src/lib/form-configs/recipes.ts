import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Configs of the styling recipes page. Each is rendered live and serialized into its source tab from
 * this one object, so a snippet cannot drift from its demo.
 */

/** Single-step contact card with two half-width fields. */
export const contactCardConfig: FormConfig = {
	id: 'contact-card',
	title: 'Contact us',
	description: 'We reply within one working day.',
	className: 'contact-card',
	view: { $type: 'card' },
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'input',
					id: 'first',
					name: 'first',
					label: 'First name',
					grid: { width: 'half' },
					rules: [{ $type: 'required', message: 'First name is required' }],
				},
				{
					$type: 'input',
					id: 'last',
					name: 'last',
					label: 'Last name',
					grid: { width: 'half' },
					rules: [{ $type: 'required', message: 'Last name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Email is required' },
						{ $type: 'email', message: 'Enter a valid email' },
					],
				},
				{ $type: 'textarea', id: 'message', name: 'message', label: 'Message', rows: 4 },
			],
		},
	],
};

/** Address fieldset whose children sit on its own inner grid. */
export const addressFormConfig: FormConfig = {
	id: 'address-form',
	title: 'Delivery',
	className: 'address-form',
	view: { $type: 'card' },
	steps: [
		{
			id: 'delivery',
			title: 'Delivery address',
			elements: [
				{
					$type: 'fieldSet',
					id: 'address',
					name: 'address',
					legend: 'Address',
					elements: [
						{ $type: 'input', id: 'street', name: 'street', label: 'Street' },
						{ $type: 'input', id: 'city', name: 'city', label: 'City', grid: { width: 'two-thirds' } },
						{ $type: 'input', id: 'zip', name: 'zip', label: 'ZIP code', grid: { width: 'third' } },
						{ $type: 'input', id: 'region', name: 'region', label: 'Region', grid: { width: 'half' } },
						{ $type: 'input', id: 'country', name: 'country', label: 'Country', grid: { width: 'half' } },
					],
				},
			],
		},
	],
};

/** Multi-step card wizard whose steps each draw their own layout. */
export const checkoutWizardConfig: FormConfig = {
	id: 'checkout-wizard',
	title: 'Checkout',
	className: 'checkout-wizard',
	view: { $type: 'card-wizard' },
	steps: [
		{
			id: 'address',
			title: 'Address',
			grid: { areas: ['street street', 'city zip'] },
			elements: [
				{ $type: 'input', id: 'street', name: 'street', label: 'Street', grid: { area: 'street' } },
				{ $type: 'input', id: 'city', name: 'city', label: 'City', grid: { area: 'city' } },
				{ $type: 'input', id: 'zip', name: 'zip', label: 'ZIP code', grid: { area: 'zip' } },
			],
		},
		{
			id: 'payment',
			title: 'Payment',
			grid: { areas: ['card card', 'expiry cvc'] },
			elements: [
				{ $type: 'input', id: 'card', name: 'card', label: 'Card number', grid: { area: 'card' } },
				{ $type: 'input', id: 'expiry', name: 'expiry', label: 'Expiry', grid: { area: 'expiry' } },
				{ $type: 'input', id: 'cvc', name: 'cvc', label: 'CVC', grid: { area: 'cvc' } },
			],
		},
	],
};

/** The drawn layout of the styling overview: five fields, stacked below `md`. */
export const drawnLayoutConfig: FormConfig = {
	id: 'drawn-layout',
	className: 'drawn-layout',
	grid: {
		areas: {
			default: ['a', 'b', 'c', 'd', 'e'],
			md: ['a a a b b b', 'a a a c c c', 'd d e e e e'],
		},
	},
	steps: [
		{
			id: 'fields',
			title: 'Fields',
			elements: [
				{ $type: 'input', id: 'a', name: 'a', label: 'A', grid: { area: 'a' } },
				{ $type: 'input', id: 'b', name: 'b', label: 'B', grid: { area: 'b' } },
				{ $type: 'input', id: 'c', name: 'c', label: 'C', grid: { area: 'c' } },
				{ $type: 'input', id: 'd', name: 'd', label: 'D', grid: { area: 'd' } },
				{ $type: 'input', id: 'e', name: 'e', label: 'E', grid: { area: 'e' } },
			],
		},
	],
};

/** A form that picks the host `tone` axis. */
export const brandFormConfig: FormConfig = {
	id: 'brand-form',
	title: 'Newsletter',
	className: 'brand-form',
	appearance: { tone: 'brand' },
	view: { $type: 'card' },
	steps: [
		{
			id: 'signup',
			title: 'Stay in touch',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ $type: 'email', message: 'Enter a valid email' }],
				},
				{ $type: 'checkbox', id: 'weekly', name: 'weekly', label: 'Weekly digest' },
			],
		},
	],
};

/** Two forms for two engines that share one theme. */
export const checkoutThemeConfig: FormConfig = {
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

export const profileThemeConfig: FormConfig = {
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

/** Overriding the `size` axis hooks and tokens. */
export const tightSizeConfig: FormConfig = {
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

/** A custom recipe shell: `view.$type` selects it and `view.shell` configures it. */
export const brandFrameConfig: FormConfig = {
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

/** A form that picks values of two axes, under a host theme file. */
export const acmeThemeConfig: FormConfig = {
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
