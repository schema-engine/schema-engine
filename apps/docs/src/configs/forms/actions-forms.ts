import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Enhanced 3-step form demo with new simplified action system
 * Demonstrates automatic execution based on triggers
 */

/**
 * Form configuration with simplified action system
 * - Global actions run automatically based on triggers
 * - Step actions run after them while their step is current
 */
export const actionsFormConfig: FormConfig = {
	id: 'enhanced-actions-demo',
	title: 'Enhanced Form Actions Demo',
	description: 'Demonstrates simplified action system with auto-save, GTM tracking, and submission handling',
	view: { $type: 'wizard' },

	steps: [
		{
			id: 'user-info',
			title: 'User Information',
			description: 'Tell us about yourself',
			elements: [
				{
					id: 'firstName',
					name: 'firstName',
					$type: 'input',
					inputType: 'text',
					label: 'First Name',
					placeholder: 'Enter your first name',
					rules: [ValidationPresets.string.required('First Name is required')],
				},
				{
					id: 'lastName',
					name: 'lastName',
					$type: 'input',
					inputType: 'text',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					rules: [ValidationPresets.string.required('Last Name is required')],
				},
				{
					id: 'email',
					name: 'email',
					$type: 'input',
					inputType: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email address',
					rules: [
						ValidationPresets.string.required('Email Address is required'),
						ValidationPresets.string.email(),
					],
				},
				{
					id: 'dateOfBirth',
					name: 'dateOfBirth',
					$type: 'input',
					inputType: 'text',
					label: 'Date of Birth',
					rules: [ValidationPresets.string.required('Date of Birth is required')],
				},
			],
			actions: [
				{
					id: 'step1-leave-tracking',
					$type: 'gtm_event',
					description: 'Track leaving the user info step by Next or a step jump',
					eventName: 'form_step_leave',
					eventData: {
						step_name: 'user_info',
						step_number: 1,
					},
					includeFormData: false,
					triggers: ['step_leave'],
					enabled: true,
				},
			],
		},
		{
			id: 'contact-info',
			title: 'Contact Information',
			description: 'How can we reach you?',
			elements: [
				{
					id: 'phone',
					name: 'phone',
					$type: 'input',
					inputType: 'tel',
					label: 'Phone Number',
					placeholder: 'Enter your phone number',
					rules: [ValidationPresets.string.required('Phone Number is required')],
				},
				{
					id: 'address',
					name: 'address',
					$type: 'input',
					inputType: 'text',
					label: 'Street Address',
					placeholder: 'Enter your street address',
					rules: [ValidationPresets.string.required('Street Address is required')],
				},
				{
					id: 'city',
					name: 'city',
					$type: 'input',
					inputType: 'text',
					label: 'City',
					placeholder: 'Enter your city',
					rules: [ValidationPresets.string.required('City is required')],
				},
				{
					id: 'zipCode',
					name: 'zipCode',
					$type: 'input',
					inputType: 'text',
					label: 'ZIP Code',
					placeholder: 'Enter your ZIP code',
					rules: [ValidationPresets.string.required('ZIP Code is required')],
				},
			],
			actions: [
				{
					id: 'step2-view-tracking',
					$type: 'gtm_event',
					description: 'Track reaching the contact info step',
					eventName: 'form_step_view',
					eventData: {
						step_name: 'contact_info',
						step_number: 2,
					},
					includeFormData: false,
					triggers: ['step_enter'],
					enabled: true,
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',
			description: 'Customize your experience',
			elements: [
				{
					id: 'newsletter',
					name: 'newsletter',
					$type: 'checkbox',
					label: 'Subscribe to Newsletter',
					description: 'Receive updates about new features and content',
				},
				{
					id: 'notifications',
					name: 'notifications',
					$type: 'select',
					label: 'Notification Preferences',
					options: [
						{ value: 'email', label: 'Email Only' },
						{ value: 'sms', label: 'SMS Only' },
						{ value: 'both', label: 'Email and SMS' },
						{ value: 'none', label: 'No Notifications' },
					],
					rules: [ValidationPresets.string.required('Please select notification preferences')],
				},
				{
					id: 'interests',
					name: 'interests',
					$type: 'checkbox',
					label: 'Areas of Interest',
					description:
						'Select your areas of interest. Note: This uses individual checkboxes instead of a group.',
					rules: [ValidationPresets.string.required('Please select at least one area of interest')],
				},
			],
			actions: [
				{
					id: 'step3-view-tracking',
					$type: 'gtm_event',
					description: 'Track reaching the preferences step',
					eventName: 'form_step_view',
					eventData: {
						step_name: 'preferences',
						step_number: 3,
					},
					includeFormData: false,
					triggers: ['step_enter'],
					enabled: true,
				},
				{
					id: 'step3-completion-tracking',
					$type: 'gtm_event',
					description: 'Track completing the last step, which is a successful submission',
					eventName: 'form_step_complete',
					eventData: {
						step_name: 'preferences',
						step_number: 3,
						final_step: true,
					},
					includeFormData: false,
					triggers: ['form_submit_success'],
					enabled: true,
				},
			],
		},
	],
	actions: [
		{
			id: 'global-auto-save',
			$type: 'auto_save',
			description: 'Automatically save form progress',
			storageKey: 'enhanced-actions-demo-autosave',
			includeSensitive: false,
			enabled: true,
		},
		{
			id: 'global-form-start-tracking',
			$type: 'gtm_event',
			description: 'Track when user starts the form',
			eventName: 'form_mount',
			eventData: {
				form_type: 'enhanced_demo',
				form_version: '2.0',
			},
			includeFormData: false,
			triggers: ['form_mount'],
			enabled: true,
		},
		{
			id: 'global-form-submit-tracking',
			$type: 'gtm_event',
			description: 'Track successful form submission',
			eventName: 'form_submit_success',
			eventData: {
				form_type: 'enhanced_demo',
				conversion_event: true,
			},
			includeFormData: ['email', 'notifications', 'interests'],
			triggers: ['form_submit'],
			enabled: true,
		},
		{
			id: 'global-submit',
			$type: 'submit',
			description: 'Submit form data to server',
			endpoint: '/api/submit-demo',
			method: 'POST',
			successMessage: 'Your information has been submitted successfully!',
			errorMessage: 'There was an error submitting your form. Please try again.',
			enabled: true,
		},
	],
};

/**
 * Simple single-step form for basic testing
 */
export const simpleActionsFormConfig: FormConfig = {
	id: 'simple-actions-demo',
	title: 'Simple Actions Demo',
	description: 'Basic form with minimal actions for testing',

	steps: [
		{
			id: 'simple-step',
			title: 'Contact Information',
			description: 'Fill in your details',
			elements: [
				{
					id: 'name',
					name: 'name',
					$type: 'input',
					inputType: 'text',
					label: 'Name',
					placeholder: 'Enter your name',
					rules: [ValidationPresets.string.required('Name is required')],
				},
				{
					id: 'email',
					name: 'email',
					$type: 'input',
					inputType: 'email',
					label: 'Email',
					placeholder: 'Enter your email',
					rules: [ValidationPresets.string.required('Email is required'), ValidationPresets.string.email()],
				},
				{
					id: 'message',
					name: 'message',
					$type: 'textarea',
					label: 'Message',
					placeholder: 'Enter your message',
					rules: [ValidationPresets.string.required('Message is required')],
				},
			],
		},
	],
	actions: [
		{
			id: 'simple-auto-save',
			$type: 'auto_save',
			description: 'Auto-save form progress',
			storageKey: 'simple-actions-demo-autosave',
			includeSensitive: false,
			enabled: true,
		},
		{
			id: 'simple-interval-save',
			$type: 'auto_save',
			description: 'Interval-based auto-save',
			storageKey: 'simple-actions-demo-interval-autosave',
			includeSensitive: false,
			enabled: true,
		},
		{
			id: 'simple-start-tracking',
			$type: 'gtm_event',
			description: 'Track when form is loaded',
			eventName: 'simple_form_mount',
			eventData: {
				form_type: 'simple_demo',
			},
			includeFormData: false,
			triggers: ['form_mount'],
			enabled: true,
		},
		{
			id: 'simple-submit-tracking',
			$type: 'gtm_event',
			description: 'Track form submission',
			eventName: 'simple_form_submit',
			eventData: {
				form_type: 'simple_demo',
				action: 'submit',
			},
			includeFormData: ['name', 'email'],
			triggers: ['form_submit'],
			enabled: true,
		},
		{
			id: 'simple-submit',
			$type: 'submit',
			description: 'Submit simple form',
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
