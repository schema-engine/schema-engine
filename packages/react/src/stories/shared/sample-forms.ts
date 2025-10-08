import type { FormConfig } from '@json-form-engine/core/schemas';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';

export const simpleContactForm: FormConfig = {
	id: 'simple-contact-form',
	title: 'Contact Form',
	description: 'Fill out this form to get in touch with us',
	mode: 'free',
	steps: [
		{
			id: 'contact-info',
			title: 'Contact Information',
			elements: [
				{
					componentId: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your full name',
					rules: [ValidationPresets.string.minLength(2, 'Name must be at least 2 characters')],
				},
				{
					componentId: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					rules: [ValidationPresets.string.email('Please enter a valid email address')],
				},
				{
					componentId: 'input',
					inputType: 'tel',
					id: 'phone',
					name: 'phone',
					label: 'Phone Number',
					placeholder: '+1 (555) 000-0000',
				},
				{
					componentId: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					placeholder: 'Tell us how we can help you...',
					rows: 4,
					rules: [ValidationPresets.string.minLength(10, 'Message must be at least 10 characters')],
				},
			],
		},
	],
};
