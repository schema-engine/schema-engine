import type { FormConfig } from '@schema-engine/forms/schemas';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';

export const simpleContactForm: FormConfig = {
	id: 'simple-contact-form',
	title: 'Contact Form',
	description: 'Fill out this form to get in touch with us',
	steps: [
		{
			id: 'contact-info',
			title: 'Contact Information',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your full name',
					rules: [ValidationPresets.string.minLength(2, 'Name must be at least 2 characters')],
				},
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					rules: [ValidationPresets.string.email('Please enter a valid email address')],
				},
				{
					$type: 'phone-input',
					id: 'phone',
					name: 'phone',
					label: 'Phone Number',
					placeholder: 'Enter phone number',
					defaultCountry: 'US',
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					placeholder: 'Tell us how we can help you...',
					rows: 4,
					rules: [ValidationPresets.string.minLength(10, 'Message must be at least 10 characters')],
				},
				{
					$type: 'submit',
					id: 'submit',
					name: 'submit',
					label: 'Send Message',
				},
			],
		},
	],
};

export const multiStepRegistrationForm: FormConfig = {
	id: 'multi-step-registration',
	title: 'Account Registration',
	description: 'Complete the registration process',
	steps: [
		{
			id: 'personal-info',
			title: 'Personal Information',
			description: 'Tell us about yourself',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'firstName',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'John',
					rules: [ValidationPresets.string.minLength(2, 'First name must be at least 2 characters')],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'lastName',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Doe',
					rules: [ValidationPresets.string.minLength(2, 'Last name must be at least 2 characters')],
				},
				{
					$type: 'input',
					inputType: 'date',
					id: 'dateOfBirth',
					name: 'dateOfBirth',
					label: 'Date of Birth',
					autoComplete: 'bday',
				},
			],
		},
		{
			id: 'contact-info',
			title: 'Contact Details',
			description: 'How can we reach you?',
			elements: [
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'john.doe@example.com',
					rules: [ValidationPresets.string.email('Please enter a valid email address')],
				},
				{
					$type: 'phone-input',
					id: 'phone',
					name: 'phone',
					label: 'Phone Number',
					placeholder: 'Enter phone number',
					defaultCountry: 'US',
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'address',
					name: 'address',
					label: 'Street Address',
					placeholder: '123 Main Street',
				},
			],
		},
		{
			id: 'account-setup',
			title: 'Account Setup',
			description: 'Create your credentials',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'username',
					name: 'username',
					label: 'Username',
					placeholder: 'johndoe',
					rules: [ValidationPresets.string.minLength(3, 'Username must be at least 3 characters')],
				},
				{
					$type: 'input',
					inputType: 'password',
					id: 'password',
					name: 'password',
					label: 'Password',
					placeholder: 'Enter a secure password',
					rules: [ValidationPresets.string.minLength(8, 'Password must be at least 8 characters')],
				},
				{
					$type: 'input',
					inputType: 'password',
					id: 'confirmPassword',
					name: 'confirmPassword',
					label: 'Confirm Password',
					placeholder: 'Re-enter your password',
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',
			description: 'Customize your experience',
			elements: [
				{
					$type: 'checkbox',
					id: 'newsletter',
					name: 'newsletter',
					label: 'Subscribe to newsletter',
				},
				{
					$type: 'checkbox',
					id: 'notifications',
					name: 'notifications',
					label: 'Enable notifications',
				},
				{
					$type: 'textarea',
					id: 'bio',
					name: 'bio',
					label: 'Bio (optional)',
					placeholder: 'Tell us a bit about yourself...',
					rows: 4,
				},
			],
		},
	],
};

export const loginForm: FormConfig = {
	id: 'login-form',
	title: 'Sign In',
	steps: [
		{
			id: 'login-step',
			title: 'Sign In',
			elements: [
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					rules: [ValidationPresets.string.email('Please enter a valid email')],
				},
				{
					$type: 'input',
					inputType: 'password',
					id: 'password',
					name: 'password',
					label: 'Password',
					placeholder: 'Enter your password',
					rules: [ValidationPresets.string.required('Password is required')],
				},
				{
					$type: 'submit',
					id: 'submit',
					name: 'submit',
					label: 'Sign In',
				},
			],
		},
	],
};

export const FormTemplates = {
	contactForm: simpleContactForm,
	registrationForm: multiStepRegistrationForm,
	loginForm,
};
