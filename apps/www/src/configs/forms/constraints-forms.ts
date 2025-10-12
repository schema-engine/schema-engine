import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';

/**
 * Demo configuration showcasing the new constraint-based naming and DynamicFieldset functionality
 */
export const constraintsDemoConfig: FormConfig = {
	id: 'constraints-demo',
	title: 'Constraints Demo',
	description: 'Showcasing field constraints and conditional logic',

	mode: 'free',
	steps: [
		{
			id: 'constraints-step',
			title: 'User Information',
			elements: [
				{
					id: 'user-type',
					name: 'userType',
					__id: 'select',
					label: 'User Type',
					rules: [ValidationPresets.string.required('Please select a user type')],
					options: [
						{ value: '', label: 'Select user type...' },
						{ value: 'individual', label: 'Individual' },
						{ value: 'business', label: 'Business' },
						{ value: 'developer', label: 'Developer' },
					],
				},
				{
					id: 'first-name',
					name: 'firstName',
					__id: 'input',
					inputType: 'text',
					label: 'First Name',
					rules: [ValidationPresets.string.required('First name is required')],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'individual',
							action: 'show',
						},
					],
				},
				{
					id: 'last-name',
					name: 'lastName',
					__id: 'input',
					inputType: 'text',
					label: 'Last Name',
					rules: [ValidationPresets.string.required('Last name is required')],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'individual',
							action: 'show',
						},
					],
				},
				{
					id: 'company-name',
					name: 'companyName',
					__id: 'input',
					inputType: 'text',
					label: 'Company Name',
					rules: [ValidationPresets.string.required('Company name is required')],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'business',
							action: 'show',
						},
					],
				},
				{
					id: 'developer-level',
					name: 'developerLevel',
					__id: 'select',
					label: 'Experience Level',
					options: [
						{ value: '', label: 'Select level...' },
						{ value: 'junior', label: 'Junior' },
						{ value: 'mid', label: 'Mid-level' },
						{ value: 'senior', label: 'Senior' },
					],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'developer',
							action: 'show',
						},
					],
				},
				{
					id: 'programming-languages',
					name: 'programmingLanguages',
					__id: 'arrayElements',
					label: 'Programming Languages',
					elements: [
						{
							id: 'language',
							name: 'language',
							__id: 'select',
							label: 'Language',
							options: [
								{ value: 'javascript', label: 'JavaScript' },
								{ value: 'typescript', label: 'TypeScript' },
								{ value: 'python', label: 'Python' },
								{ value: 'java', label: 'Java' },
								{ value: 'go', label: 'Go' },
								{ value: 'rust', label: 'Rust' },
							],
						},
						{
							id: 'proficiency',
							name: 'proficiency',
							__id: 'select',
							label: 'Proficiency',
							options: [
								{ value: 'beginner', label: 'Beginner' },
								{ value: 'intermediate', label: 'Intermediate' },
								{ value: 'advanced', label: 'Advanced' },
								{ value: 'expert', label: 'Expert' },
							],
						},
					],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'developer',
							action: 'show',
						},
					],
				},
				{
					id: 'email',
					name: 'email',
					__id: 'input',
					inputType: 'email',
					label: 'Email Address',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email address'),
					],
				},
				{
					id: 'phone',
					name: 'phone',
					__id: 'input',
					inputType: 'tel',
					label: 'Phone Number',
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'business',
							action: 'require',
						},
					],
				},
				{
					id: 'newsletter',
					name: 'newsletter',
					__id: 'checkbox',
					label: 'Subscribe to newsletter',
					defaultValue: false,
				},
				{
					id: 'special-offers',
					name: 'specialOffers',
					__id: 'checkbox',
					label: 'Receive special offers',
					defaultValue: false,
					constraints: [
						{
							field: 'newsletter',
							operator: 'equals',
							value: true,
							action: 'enable',
						},
					],
				},
				{
					__id: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
	actions: [
		{
			id: 'constraints-forms-submit',
			type: 'submit',
			description: 'Submit constraints form',
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
