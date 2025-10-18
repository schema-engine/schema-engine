import type { FormConfig } from '@json-form-engine/core/schemas';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import '@json-form-engine/react/registrations';
import '@json-form-engine/core/actions/registry';

/**
 * Basic form example configuration
 */
export const basicFormConfig: FormConfig = {
	id: 'basic-demo',
	title: 'Basic Form Example',
	mode: 'free',
	steps: [
		{
			id: 'basic-step',
			title: 'Basic Information',
			elements: [
				{
					__id: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					rules: [ValidationPresets.string.required('Full name is required')],
					placeholder: 'Enter your full name',
				},
				{
					__id: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email address'),
					],
					placeholder: 'your.email@example.com',
				},
				{
					__id: 'number',
					id: 'age',
					name: 'age',
					label: 'Age',
					rules: [
						ValidationPresets.string.required('Age is required'),
						ValidationPresets.number.min(18, 'Must be at least 18 years old'),
						ValidationPresets.number.max(100, 'Age must be realistic'),
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
			id: 'responsive-forms-submit',
			type: 'submit',
			description: 'Submit responsive form',
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
 * Conditional form example configuration
 */
export const conditionalFormConfig: FormConfig = {
	id: 'conditional-demo',
	title: 'Advanced Conditional Logic Demo',

	mode: 'free',
	steps: [
		{
			id: 'conditional-step',
			title: 'Conditional Fields',
			elements: [
				{
					__id: 'select',
					id: 'user-type',
					name: 'userType',
					label: 'User Type',
					rules: [ValidationPresets.string.required('Please select a user type')],
					options: [
						{ value: 'student', label: 'Student' },
						{ value: 'professional', label: 'Professional' },
						{ value: 'enterprise', label: 'Enterprise' },
					],
				},
				{
					__id: 'input',
					inputType: 'text',
					id: 'school-name',
					name: 'schoolName',
					label: 'School Name',
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'student',
							action: 'show',
						},
					],
				},
				{
					__id: 'select',
					id: 'degree-level',
					name: 'degreeLevel',
					label: 'Degree Level',
					options: [
						{ value: 'undergraduate', label: 'Undergraduate' },
						{ value: 'graduate', label: 'Graduate' },
						{ value: 'doctoral', label: 'Doctoral' },
					],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'student',
							action: 'show',
						},
					],
				},
				{
					__id: 'input',
					inputType: 'text',
					id: 'company-name',
					name: 'companyName',
					label: 'Company Name',
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'professional',
							action: 'show',
						},
					],
				},
				{
					__id: 'input',
					inputType: 'text',
					id: 'job-title',
					name: 'jobTitle',
					label: 'Job Title',
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'professional',
							action: 'show',
						},
					],
				},
				{
					__id: 'number',
					id: 'years-experience',
					name: 'yearsExperience',
					label: 'Years of Experience',
					rules: [ValidationPresets.number.min(0, 'Experience cannot be negative')],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'professional',
							action: 'show',
						},
					],
				},
				{
					__id: 'input',
					inputType: 'text',
					id: 'organization-name',
					name: 'organizationName',
					label: 'Organization Name',
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'enterprise',
							action: 'show',
						},
					],
				},
				{
					__id: 'number',
					id: 'employee-count',
					name: 'employeeCount',
					label: 'Number of Employees',
					rules: [ValidationPresets.number.min(1, 'Must have at least 1 employee')],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'enterprise',
							action: 'show',
						},
					],
				},
				{
					__id: 'select',
					id: 'industry',
					name: 'industry',
					label: 'Industry',
					options: [
						{ value: 'tech', label: 'Technology' },
						{ value: 'finance', label: 'Finance' },
						{ value: 'healthcare', label: 'Healthcare' },
						{ value: 'manufacturing', label: 'Manufacturing' },
						{ value: 'education', label: 'Education' },
						{ value: 'other', label: 'Other' },
					],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'enterprise',
							action: 'show',
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
};

/**
 * Array fields example configuration
 */
export const arrayFormConfig: FormConfig = {
	id: 'array-demo',
	title: 'Dynamic Array Fields Demo',

	mode: 'free',
	steps: [
		{
			id: 'array-step',
			title: 'Array Fields',
			elements: [
				{
					__id: 'input',
					inputType: 'text',
					id: 'project-name',
					name: 'projectName',
					label: 'Project Name',
					rules: [ValidationPresets.string.required('Project name is required')],
				},
				{
					__id: 'arrayElements',
					id: 'team-members',
					name: 'teamMembers',
					label: 'Team Members',
					description: 'Add team members to your project',
					rules: [ValidationPresets.string.required('At least one team member is required')],
					elements: [
						{
							__id: 'input',
							inputType: 'text',
							id: 'member-name',
							name: 'name',
							label: 'Full Name',
							rules: [ValidationPresets.string.required('Name is required')],
						},
						{
							__id: 'input',
							inputType: 'email',
							id: 'member-email',
							name: 'email',
							label: 'Email',
							rules: [
								ValidationPresets.string.required('Email is required'),
								ValidationPresets.string.email('Please enter a valid email'),
							],
						},
						{
							__id: 'select',
							id: 'member-role',
							name: 'role',
							label: 'Role',
							rules: [ValidationPresets.string.required('Role is required')],
							options: [
								{ value: 'developer', label: 'Developer' },
								{ value: 'designer', label: 'Designer' },
								{ value: 'manager', label: 'Project Manager' },
								{ value: 'qa', label: 'QA Engineer' },
							],
						},
					],
				},
				{
					__id: 'arrayElements',
					id: 'project-tags',
					name: 'tags',
					label: 'Project Tags',
					description: 'Add relevant tags for your project',
					elements: [
						{
							__id: 'input',
							inputType: 'text',
							id: 'tag',
							name: 'tag',
							label: 'Tag',
							placeholder: 'e.g., React, TypeScript, API',
						},
					],
				},
			],
		},
	],
	actions: [
		{
			id: 'array-forms-submit',
			type: 'submit',
			description: 'Submit array form',
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
 * Complex form example configuration
 */
export const complexFormConfig: FormConfig = {
	id: 'complex-demo',
	title: 'Complex Form with All Features',

	mode: 'free',
	steps: [
		{
			id: 'complex-step',
			title: 'Complex Form',
			elements: [
				{
					__id: 'input',
					inputType: 'text',
					id: 'full-name',
					name: 'fullName',
					label: 'Full Name',
					rules: [
						ValidationPresets.string.required('Full name is required'),
						ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
					],
					grid: {
						column: 'span 2',
					},
				},
				{
					__id: 'input',
					inputType: 'email',
					id: 'email-address',
					name: 'emailAddress',
					label: 'Email Address',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email'),
					],
				},
				{
					__id: 'input',
					inputType: 'tel',
					id: 'phone-number',
					name: 'phoneNumber',
					label: 'Phone Number',
					rules: [ValidationPresets.string.required('Phone number is required')],
				},
				{
					__id: 'select',
					id: 'country',
					name: 'country',
					label: 'Country',
					rules: [ValidationPresets.string.required('Please select your country')],
					options: [
						{ value: 'us', label: 'United States' },
						{ value: 'ca', label: 'Canada' },
						{ value: 'uk', label: 'United Kingdom' },
						{ value: 'de', label: 'Germany' },
						{ value: 'fr', label: 'France' },
						{ value: 'jp', label: 'Japan' },
						{ value: 'au', label: 'Australia' },
					],
				},
				{
					__id: 'select',
					id: 'subscription-type',
					name: 'subscriptionType',
					label: 'Subscription Type',
					rules: [ValidationPresets.string.required('Please select a subscription type')],
					options: [
						{ value: 'basic', label: 'Basic - $9/month' },
						{ value: 'pro', label: 'Pro - $29/month' },
						{ value: 'enterprise', label: 'Enterprise - $99/month' },
					],
				},
				{
					__id: 'checkbox',
					id: 'newsletter-subscribe',
					name: 'newsletterSubscribe',
					label: 'Subscribe to our newsletter for updates and promotions',
				},
				{
					__id: 'checkbox',
					id: 'terms-agreement',
					name: 'termsAgreement',
					label: 'I agree to the Terms of Service and Privacy Policy',
					rules: [ValidationPresets.boolean.required('You must agree to the terms')],
				},
			],
		},
	],
	actions: [
		{
			id: 'array-forms-submit',
			type: 'submit',
			description: 'Submit array form',
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
