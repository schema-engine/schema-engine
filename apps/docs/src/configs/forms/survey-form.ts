import { ValidationPresets, type FormConfig } from '@schema-engine/forms/schemas';

export const surveyFormConfig: FormConfig = {
	id: 'customer-survey',
	title: 'Customer Satisfaction Survey',
	description: 'Help us improve our services',
	mode: 'wizard',
	stepper: {
		$type: 'minimalist',
		showProgress: true,
	},
	steps: [
		{
			id: 'experience',
			title: 'Your Experience',
			elements: [
				{
					id: 'satisfaction',
					$type: 'select',
					name: 'satisfaction',
					label: 'Overall Satisfaction',
					options: [
						{ label: 'Very Satisfied', value: '5' },
						{ label: 'Satisfied', value: '4' },
						{ label: 'Neutral', value: '3' },
						{ label: 'Dissatisfied', value: '2' },
						{ label: 'Very Dissatisfied', value: '1' },
					],
					rules: [ValidationPresets.string.required('Please select a satisfaction rating')],
				},
				{
					id: 'recommendation',
					$type: 'radio',
					name: 'recommendation',
					label: 'Would you recommend us?',
					options: [
						{ label: 'Definitely', value: 'yes' },
						{ label: 'Probably', value: 'maybe' },
						{ label: 'No', value: 'no' },
					],
					rules: [ValidationPresets.string.required('Please tell us if you would recommend us')],
				},
			],
		},
		{
			id: 'feedback',
			title: 'Feedback',
			elements: [
				{
					id: 'improvements',
					$type: 'textarea',
					name: 'improvements',
					label: 'What could we improve?',
					placeholder: 'Share your suggestions...',
				},
				{
					id: 'contact',
					$type: 'checkbox',
					name: 'contact',
					label: 'I agree to be contacted for follow-up',
				},
				{
					$type: 'submit',
					id: 'survey-submit',
					name: 'submit',
					label: 'Submit survey',
				},
			],
		},
	],
	actions: [
		{
			id: 'survey-submit',
			$type: 'submit',
			endpoint: '/api/submit-demo',
			method: 'POST',
			successMessage: 'Thank you for your feedback!',
			errorMessage: 'Failed to submit survey. Please try again.',
			enabled: true,
		},
	],
};
