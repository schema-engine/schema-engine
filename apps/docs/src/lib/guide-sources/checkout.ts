import type { FormConfig } from '@schema-engine/forms';

/**
 * A three-step checkout that both renderers draw.
 *
 * @remarks
 * `view.$type` names the wizard recipe, which draws Previous, Next and the submit button. The `company` step is
 * skipped unless the buyer is a company, and `navigation: 'linear'` lets a visitor jump only to steps already visited.
 */
export const checkout: FormConfig = {
	id: 'checkout',
	view: { $type: 'wizard' },
	navigation: 'linear',
	steps: [
		{
			id: 'contact',
			title: 'Contact',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ $type: 'required', message: 'Enter your email' }],
				},
				{
					$type: 'select',
					id: 'buyer',
					name: 'buyer',
					label: 'Buying as',
					defaultValue: 'person',
					options: [
						{ value: 'person', label: 'A person' },
						{ value: 'company', label: 'A company' },
					],
				},
			],
		},
		{
			id: 'company',
			title: 'Company',
			constraints: [{ $type: 'show', field: 'buyer', operator: 'equals', value: 'company' }],
			elements: [
				{
					$type: 'input',
					id: 'vat',
					name: 'vat',
					label: 'VAT number',
					rules: [{ $type: 'required', message: 'Enter the VAT number' }],
				},
			],
		},
		{
			id: 'payment',
			title: 'Payment',
			elements: [
				{
					$type: 'input',
					id: 'card',
					name: 'card',
					label: 'Card number',
					rules: [{ $type: 'required', message: 'Enter the card number' }],
				},
			],
		},
	],
};
