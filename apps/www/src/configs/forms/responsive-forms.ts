import type { FormConfig } from '@schema-engine/forms/schemas';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import '@/lib/form-engine-setup';

/**
 * Responsive grid demo form configuration
 */
export const responsiveFormConfig: FormConfig = {
	id: 'responsive-demo-form',
	title: 'Responsive Contact Form',
	description: 'A demonstration of the responsive grid layout system',

	mode: 'free',
	grid: {
		columns: 12,
		gap: '1.5rem',
		responsive: {
			default: { columns: 1, gap: '1rem' },
			md: { columns: 2, gap: '1.25rem' },
			lg: { columns: 3, gap: '1.5rem' },
			xl: { columns: 4, gap: '2rem' },
		},
	},
	steps: [
		{
			id: 'responsive-step',
			title: 'Contact Information',
			elements: [
				{
					id: 'firstName',
					name: 'firstName',
					$type: 'input',
					inputType: 'text',
					label: 'First Name',
					placeholder: 'Enter your first name',
					rules: [ValidationPresets.string.required('First name is required')],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '1 / 2' },
							lg: { column: '1 / 2' },
							xl: { column: '1 / 2' },
						},
					},
				},
				{
					id: 'lastName',
					name: 'lastName',
					$type: 'input',
					inputType: 'text',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					rules: [ValidationPresets.string.required('Last name is required')],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '2 / 3' },
							lg: { column: '2 / 3' },
							xl: { column: '2 / 3' },
						},
					},
				},
				{
					id: 'email',
					name: 'email',
					$type: 'input',
					inputType: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email address'),
					],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							lg: { column: '1 / 3' },
						},
					},
				},
				{
					id: 'phone',
					name: 'phone',
					$type: 'input',
					inputType: 'tel',
					label: 'Phone Number',
					placeholder: '+1 (555) 000-0000',
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '1 / 2' },
						},
					},
				},
				{
					id: 'company',
					name: 'company',
					$type: 'input',
					inputType: 'text',
					label: 'Company',
					placeholder: 'Your company name',
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '2 / 3' },
							lg: { column: '1 / 2' },
							xl: { column: '4 / 5' },
						},
					},
				},
				{
					id: 'position',
					name: 'position',
					$type: 'input',
					inputType: 'text',
					label: 'Position',
					placeholder: 'Your job title',
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '1 / 2' },
							lg: { column: '2 / 3' },
							xl: { column: '1 / 2' },
						},
					},
				},
				{
					id: 'experience',
					name: 'experience',
					$type: 'select',
					label: 'Years of Experience',
					rules: [ValidationPresets.string.required('Please select your experience level')],
					options: [
						{ value: '0-1', label: '0-1 years' },
						{ value: '2-5', label: '2-5 years' },
						{ value: '6-10', label: '6-10 years' },
						{ value: '10+', label: '10+ years' },
					],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '2 / 3' },
							lg: { column: '3 / 4' },
							xl: { column: '2 / 3' },
						},
					},
				},
				{
					id: 'interests',
					name: 'interests',
					$type: 'radio',
					label: 'Primary Area of Interest',
					options: [
						{ value: 'frontend', label: 'Frontend Development' },
						{ value: 'backend', label: 'Backend Development' },
						{ value: 'design', label: 'UI/UX Design' },
						{ value: 'mobile', label: 'Mobile Development' },
					],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '1 / -1' },
							lg: { column: '1 / -1' },
							xl: { column: '3 / 5' },
						},
					},
				},
				{
					id: 'message',
					name: 'message',
					$type: 'textarea',
					label: 'Message',
					placeholder: 'Tell us about yourself and your goals...',
					rows: 4,
					grid: {
						responsive: {
							default: { column: '1 / -1', row: 'span 2' },
							md: { column: '1 / -1', row: 'span 2' },
							lg: { column: '1 / -1', row: 'span 2' },
							xl: { column: '1 / -1', row: 'span 2' },
						},
					},
				},
				{
					id: 'newsletter',
					name: 'newsletter',
					$type: 'checkbox',
					label: 'Subscribe to newsletter',
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '1 / 2' },
							lg: { column: '1 / 2' },
							xl: { column: '1 / 2' },
						},
					},
				},
				{
					id: 'terms',
					name: 'terms',
					$type: 'checkbox',
					label: 'I agree to the Terms and Conditions',
					rules: [ValidationPresets.string.required('You must agree to the terms')],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '2 / 3' },
							lg: { column: '2 / 3' },
							xl: { column: '2 / 3' },
						},
					},
				},
				{
					$type: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
	actions: [
		{
			id: 'responsive-forms-submit',
			$type: 'submit',
			description: 'Submit responsive form',
			endpoint: '/api/submit-demo',
			method: 'POST',
			successMessage: 'Message sent successfully!',
			errorMessage: 'Failed to send message. Please try again.',
			enabled: true,
		},
		{
			id: 'reset-after-success',
			$type: 'reset',
			enabled: true,
			triggers: ['form_submit_success'],
			resetToDefaults: true,
		},
	],
};
