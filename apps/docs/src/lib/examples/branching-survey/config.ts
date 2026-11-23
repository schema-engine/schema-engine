import type { FormConfig } from '@schema-engine/forms';

/**
 * A support survey that asks a follow-up only of a customer who had a poor experience.
 *
 * @remarks
 * The `problem` step has a constraint on a field of an earlier step. While it hides the step, Next and Previous
 * pass over it, the step counts in no progress, its fields are not validated and its values are left out of the
 * submission. The first step cannot carry a constraint, because nothing comes before it to depend on.
 */
export const survey: FormConfig = {
	id: 'support-survey',
	title: 'How did we do?',
	view: { $type: 'wizard' },
	steps: [
		{
			id: 'experience',
			title: 'Your experience',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Your name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{
					$type: 'select',
					id: 'satisfaction',
					name: 'satisfaction',
					label: 'How was your support request?',
					placeholder: 'Choose one',
					options: [
						{ value: 'great', label: 'Great' },
						{ value: 'fine', label: 'Fine' },
						{ value: 'poor', label: 'Poor' },
					],
					rules: [{ $type: 'required', message: 'Choose one' }],
				},
			],
		},
		{
			id: 'problem',
			title: 'What went wrong',
			constraints: [{ field: 'satisfaction', operator: 'equals', value: 'poor', $type: 'show' }],
			elements: [
				{
					$type: 'select',
					id: 'reason',
					name: 'reason',
					label: 'What was the main problem?',
					placeholder: 'Choose one',
					options: [
						{ value: 'slow', label: 'It took too long' },
						{ value: 'unresolved', label: 'It was not solved' },
						{ value: 'rude', label: 'The agent was unhelpful' },
					],
					rules: [{ $type: 'required', message: 'Choose the main problem' }],
				},
				{
					$type: 'textarea',
					id: 'details',
					name: 'details',
					label: 'Tell us what happened',
					rows: 4,
					rules: [{ $type: 'minLength', value: 20, message: 'Use at least 20 characters' }],
				},
			],
		},
		{
			id: 'comments',
			title: 'Anything else?',
			elements: [{ $type: 'textarea', id: 'comments', name: 'comments', label: 'Comments', rows: 4 }],
		},
	],
};
