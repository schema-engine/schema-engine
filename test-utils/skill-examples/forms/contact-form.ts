import { engine } from './engine';

export const contactForm = engine.defineForm({
	id: 'contact',
	validationMode: 'onBlur',
	steps: [
		{
			id: 'details',
			title: 'Details',
			elements: [
				{
					$type: 'text',
					name: 'name',
					rules: [{ $type: 'required', id: 'name-required', message: 'Name is required' }],
				},
				{
					$type: 'text',
					name: 'email',
					rules: [{ $type: 'required' }, { $type: 'email', message: 'Not an email' }],
				},
				{
					$type: 'text',
					name: 'nickname',
					rules: [{ $type: 'minLength', value: 3, severity: 'warning', id: 'nickname-short' }],
				},
				{
					$type: 'text',
					name: 'company',
					constraints: [{ field: 'email', operator: 'contains', value: '@example.com', $type: 'hide' }],
				},
			],
		},
	],
});
