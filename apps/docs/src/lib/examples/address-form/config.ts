import type { FormConfig } from '@schema-engine/forms';

/** Address fieldset whose children sit on its own inner grid. */
export const addressForm: FormConfig = {
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
