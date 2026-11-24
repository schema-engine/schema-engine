import type { FormConfig } from '@schema-engine/forms';

/**
 * The contact form both renderers render.
 *
 * @remarks
 * It is data, so it could equally be a JSON file or a server's answer. The ticket field shows only for a support
 * request, and is validated only then: a field a constraint hides takes no part in validation or in the submitted
 * values.
 */
export const contactForm: FormConfig = {
	id: 'contact',
	title: 'Contact us',
	description: 'We answer within one working day.',
	steps: [
		{
			id: 'details',
			title: 'Contact us',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Enter your email' },
						{ $type: 'email', message: 'Enter a valid email address' },
					],
				},
				{
					$type: 'select',
					id: 'subject',
					name: 'subject',
					label: 'Subject',
					placeholder: 'Choose a subject',
					options: [
						{ value: 'general', label: 'General question' },
						{ value: 'support', label: 'Technical support' },
					],
					rules: [{ $type: 'required', message: 'Choose a subject' }],
				},
				{
					$type: 'input',
					id: 'ticket',
					name: 'ticket',
					label: 'Support ticket',
					placeholder: 'SUP-1024',
					constraints: [{ field: 'subject', operator: 'equals', value: 'support', $type: 'show' }],
					rules: [
						{ $type: 'required', message: 'Enter your ticket number' },
						{
							$type: 'pattern',
							value: '^[A-Z]{2,4}-[0-9]{3,6}$',
							message: 'Use a ticket number such as SUP-1024',
						},
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
					rules: [
						{ $type: 'required', message: 'Write a message' },
						{ $type: 'minLength', value: 10, message: 'Use at least 10 characters' },
					],
				},
				{ $type: 'submit', id: 'send', name: 'send', label: 'Send message' },
			],
		},
	],
};
