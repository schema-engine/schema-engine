import type { FormConfig } from '@json-form-engine/core/schemas';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import '@/lib/form-engine-setup';

/**
 * Multi-step registration form configuration
 */
export const multiStepRegistrationConfig: FormConfig = {
	id: 'multi-step-user-registration',
	title: 'User Registration',
	description: 'Complete your registration by filling out all required information.',
	mode: 'wizard',

	steps: [
		{
			id: 'personal-info',
			title: 'Personal Information',
			description: 'Tell us about yourself',
			icon: '👤',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'firstName',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'Enter your first name',
					rules: [
						ValidationPresets.string.required('First name is required'),
						ValidationPresets.string.minLength(2, 'First name must be at least 2 characters'),
					],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'lastName',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					rules: [
						ValidationPresets.string.required('Last name is required'),
						ValidationPresets.string.minLength(2, 'Last name must be at least 2 characters'),
					],
				},
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email address'),
					],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'dateOfBirth',
					name: 'dateOfBirth',
					label: 'Date of Birth',
					placeholder: 'MM/DD/YYYY',
					rules: [ValidationPresets.string.required('Date of birth is required')],
				},
			],
		},
		{
			id: 'contact-info',
			title: 'Contact Information',
			description: 'How can we reach you?',
			icon: '📞',
			elements: [
				{
					$type: 'input',
					inputType: 'tel',
					id: 'phone',
					name: 'phone',
					label: 'Phone Number',
					placeholder: 'Enter your phone number',
					rules: [
						ValidationPresets.string.required('Phone number is required'),
						ValidationPresets.string.minLength(10, 'Phone number must be at least 10 digits'),
					],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'address',
					name: 'address',
					label: 'Street Address',
					placeholder: 'Enter your street address',
					rules: [ValidationPresets.string.required('Street address is required')],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'city',
					name: 'city',
					label: 'City',
					placeholder: 'Enter your city',
					rules: [ValidationPresets.string.required('City is required')],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'zipCode',
					name: 'zipCode',
					label: 'ZIP Code',
					placeholder: 'Enter your ZIP code',
					rules: [ValidationPresets.string.required('ZIP code is required')],
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',
			description: 'Customize your experience',
			icon: '⚙️',
			elements: [
				{
					$type: 'select',
					id: 'language',
					name: 'language',
					label: 'Preferred Language',
					options: [
						{ value: 'en', label: 'English' },
						{ value: 'es', label: 'Spanish' },
						{ value: 'fr', label: 'French' },
						{ value: 'de', label: 'German' },
					],
					defaultValue: 'en',
				},
				{
					$type: 'textarea',
					id: 'bio',
					name: 'bio',
					label: 'Bio',
					placeholder: 'Tell us about yourself (optional)',
				},
			],
		},
	],
	stepper: {
		$type: 'default',
		orientation: 'horizontal',
	},
	grid: {
		columns: 2,
		gap: '1rem',
		responsive: {
			default: { columns: 1 },
			md: { columns: 2 },
		},
	},
	actions: [
		{
			id: 'multi-step-forms-submit',
			type: 'submit',
			description: 'Submit multi-step form',
			endpoint: '/api/submit-demo',
			method: 'POST',
			successMessage: 'Message sent successfully!',
			errorMessage: 'Failed to send message. Please try again.',
			enabled: true,
		},
		{
			id: 'reset-after-success',
			type: 'reset',
			enabled: true,
			triggers: ['submit_success'],
			resetToDefaults: true,
		},
	],
};

/**
 * Vertical stepper variant
 */
export const verticalStepperConfig: FormConfig = {
	...multiStepRegistrationConfig,
	id: 'vertical-stepper-demo',
	stepper: {
		$type: 'default',
		showStepNumbers: true,
		showStepTitles: true,
		orientation: 'horizontal',
	},
};

/**
 * Minimal stepper variant
 */
export const minimalStepperConfig: FormConfig = {
	...multiStepRegistrationConfig,
	id: 'minimal-stepper-demo',
	mode: 'free',
	stepper: {
		$type: 'minimalist',
		showProgress: true,
	},
};
