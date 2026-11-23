import type { FormConfig } from '@schema-engine/forms/schemas';

/** Customer satisfaction survey with a conditional follow-up field. */
export const surveyDemoConfig: FormConfig = {
	id: 'customer-survey',
	title: 'Customer satisfaction',
	view: { $type: 'wizard' },
	steps: [
		{
			id: 'rating',
			title: 'Your experience',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					placeholder: 'Enter your name',
					rules: [{ $type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'select',
					id: 'satisfaction',
					name: 'satisfaction',
					label: 'How satisfied are you?',
					options: [
						{ value: '5', label: 'Very satisfied' },
						{ value: '3', label: 'Neutral' },
						{ value: '1', label: 'Very dissatisfied' },
					],
					rules: [{ $type: 'required', message: 'Satisfaction is required' }],
				},
			],
		},
		{
			id: 'feedback',
			title: 'Feedback',
			elements: [
				{
					$type: 'input',
					id: 'feedback',
					name: 'feedback',
					label: 'Feedback',
					placeholder: 'Enter your feedback',
				},

				{
					$type: 'textarea',
					id: 'improvements',
					name: 'improvements',
					label: 'What could we improve?',
					constraints: [{ field: 'satisfaction', operator: 'equals', value: '1', action: 'show' }],
				},
			],
		},
	],
};
