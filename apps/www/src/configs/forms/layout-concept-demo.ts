import type { FormConfig } from '@json-form-engine/core';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import '@json-form-engine/react/registrations';

/**
 * CONCEPT DEMO: Layout and Stepper Registry System
 *
 * This demonstrates the JSON configuration for our new layout and stepper system.
 * Note: The actual components are not yet registered, this shows the intended API.
 */

/**
 * Demo showing how step layouts would work
 */
export const conceptStepLayoutDemo: FormConfig = {
	id: 'step-layout-concept-demo',
	title: 'Step Layout System Demo',
	description: 'Different layouts for different steps',
	mode: 'wizard',

	// This would use a custom stepper (when registered)
	// stepper: {
	// 	__stepperId: 'progress-bar',
	// 	primaryColor: '#6366f1'
	// },

	steps: [
		{
			id: 'card-layout-step',
			title: 'Card Layout',
			description: 'This step would use a card layout wrapper',

			// This would use a custom layout (when registered)
			// layout: {
			// 	__layoutId: 'card',
			// 	maxWidth: '500px',
			// 	shadowSize: 'large'
			// },

			elements: [
				{
					__id: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your name',
					rules: [ValidationPresets.string.required('Name is required')],
				},
				{
					__id: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your@email.com',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Invalid email'),
					],
				},
			],
		},
		{
			id: 'split-screen-step',
			title: 'Split Screen Layout',
			description: 'This step would use split screen with sidebar',

			// This would use a different layout
			// layout: {
			// 	__layoutId: 'split-screen',
			// 	sidePlacement: 'right',
			// 	sideContent: 'Help content and tips would go here'
			// },

			elements: [
				{
					__id: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Your Message',
					placeholder: 'Tell us what you think...',
					rules: [ValidationPresets.string.required('Message is required')],
				},
				{
					__id: 'select',
					id: 'category',
					name: 'category',
					label: 'Category',
					options: [
						{ value: 'general', label: 'General Inquiry' },
						{ value: 'support', label: 'Technical Support' },
						{ value: 'feedback', label: 'Feedback' },
					],
					rules: [ValidationPresets.string.required('Please select a category')],
				},
				{
					__id: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
};

/**
 * Demo showing current CSS Grid system (this works today)
 */
export const currentGridSystemDemo: FormConfig = {
	id: 'current-grid-demo',
	title: 'Current CSS Grid System',
	description: 'This demonstrates our existing responsive grid system',
	mode: 'wizard',

	// CSS Grid configuration (this works)
	grid: {
		columns: 12,
		gap: '1.5rem',
		responsive: {
			default: { columns: 1, gap: '1rem' },
			md: { columns: 2, gap: '1.25rem' },
			lg: { columns: 3, gap: '1.5rem' },
		},
	},

	steps: [
		{
			id: 'grid-demo-step',
			title: 'Responsive Grid Demo',
			description: 'Elements arranged in CSS Grid',

			elements: [
				{
					__id: 'input',
					inputType: 'text',
					id: 'firstName',
					name: 'firstName',
					label: 'First Name',
					rules: [ValidationPresets.string.required()],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '1 / 2' },
							lg: { column: '1 / 2' },
						},
					},
				},
				{
					__id: 'input',
					inputType: 'text',
					id: 'lastName',
					name: 'lastName',
					label: 'Last Name',
					rules: [ValidationPresets.string.required()],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							md: { column: '2 / 3' },
							lg: { column: '2 / 3' },
						},
					},
				},
				{
					__id: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					rules: [ValidationPresets.string.email()],
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							lg: { column: '1 / 3' },
						},
					},
				},
				{
					__id: 'textarea',
					id: 'bio',
					name: 'bio',
					label: 'Bio',
					placeholder: 'Tell us about yourself...',
					grid: {
						responsive: {
							default: { column: '1 / -1' },
							lg: { column: '1 / -1' },
						},
					},
				},
				{
					__id: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
};
