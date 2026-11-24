import type { FormConfig } from '@schema-engine/forms';

/** Multi-step card wizard whose steps each draw their own layout. */
export const checkoutWizard: FormConfig = {
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
