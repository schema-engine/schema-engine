import type { FormConfig } from '@json-form-engine/core/schemas';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import '@json-form-engine/react/components/form/registry';
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
					componentId: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					rules: [ValidationPresets.required('Full name is required')],
					placeholder: 'Enter your full name',
				},
				{
					componentId: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					rules: [
						ValidationPresets.required('Email is required'),
						ValidationPresets.email('Please enter a valid email address'),
					],
					placeholder: 'your.email@example.com',
				},
				{
					componentId: 'number',
					id: 'age',
					name: 'age',
					label: 'Age',
					rules: [
						ValidationPresets.required('Age is required'),
						ValidationPresets.min(18, 'Must be at least 18 years old'),
						ValidationPresets.max(100, 'Age must be realistic'),
					],
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
					componentId: 'select',
					id: 'user-type',
					name: 'userType',
					label: 'User Type',
					rules: [ValidationPresets.required('Please select a user type')],
					options: [
						{ value: 'student', label: 'Student' },
						{ value: 'professional', label: 'Professional' },
						{ value: 'enterprise', label: 'Enterprise' },
					],
				},
				{
					componentId: 'input',
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
					componentId: 'select',
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
					componentId: 'input',
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
					componentId: 'input',
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
					componentId: 'number',
					id: 'years-experience',
					name: 'yearsExperience',
					label: 'Years of Experience',
					rules: [ValidationPresets.min(0, 'Experience cannot be negative')],
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
					componentId: 'input',
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
					componentId: 'number',
					id: 'employee-count',
					name: 'employeeCount',
					label: 'Number of Employees',
					rules: [ValidationPresets.min(1, 'Must have at least 1 employee')],
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
					componentId: 'select',
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
					componentId: 'input',
					inputType: 'text',
					id: 'project-name',
					name: 'projectName',
					label: 'Project Name',
					rules: [ValidationPresets.required('Project name is required')],
				},
				{
					componentId: 'arrayElements',
					id: 'team-members',
					name: 'teamMembers',
					label: 'Team Members',
					description: 'Add team members to your project',
					rules: [ValidationPresets.required('At least one team member is required')],
					elements: [
						{
							componentId: 'input',
							inputType: 'text',
							id: 'member-name',
							name: 'name',
							label: 'Full Name',
							rules: [ValidationPresets.required('Name is required')],
						},
						{
							componentId: 'input',
							inputType: 'email',
							id: 'member-email',
							name: 'email',
							label: 'Email',
							rules: [
								ValidationPresets.required('Email is required'),
								ValidationPresets.email('Please enter a valid email'),
							],
						},
						{
							componentId: 'select',
							id: 'member-role',
							name: 'role',
							label: 'Role',
							rules: [ValidationPresets.required('Role is required')],
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
					componentId: 'arrayElements',
					id: 'project-tags',
					name: 'tags',
					label: 'Project Tags',
					description: 'Add relevant tags for your project',
					elements: [
						{
							componentId: 'input',
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
					componentId: 'input',
					inputType: 'text',
					id: 'full-name',
					name: 'fullName',
					label: 'Full Name',
					rules: [
						ValidationPresets.required('Full name is required'),
						ValidationPresets.minLength(2, 'Name must be at least 2 characters'),
					],
					grid: {
						column: 'span 2',
					},
				},
				{
					componentId: 'input',
					inputType: 'email',
					id: 'email-address',
					name: 'emailAddress',
					label: 'Email Address',
					rules: [
						ValidationPresets.required('Email is required'),
						ValidationPresets.email('Please enter a valid email'),
					],
				},
				{
					componentId: 'input',
					inputType: 'tel',
					id: 'phone-number',
					name: 'phoneNumber',
					label: 'Phone Number',
					rules: [ValidationPresets.required('Phone number is required')],
				},
				{
					componentId: 'select',
					id: 'country',
					name: 'country',
					label: 'Country',
					rules: [ValidationPresets.required('Please select your country')],
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
					componentId: 'select',
					id: 'subscription-type',
					name: 'subscriptionType',
					label: 'Subscription Type',
					rules: [ValidationPresets.required('Please select a subscription type')],
					options: [
						{ value: 'basic', label: 'Basic - $9/month' },
						{ value: 'pro', label: 'Pro - $29/month' },
						{ value: 'enterprise', label: 'Enterprise - $99/month' },
					],
				},
				{
					componentId: 'checkbox',
					id: 'newsletter-subscribe',
					name: 'newsletterSubscribe',
					label: 'Subscribe to our newsletter for updates and promotions',
				},
				{
					componentId: 'checkbox',
					id: 'terms-agreement',
					name: 'termsAgreement',
					label: 'I agree to the Terms of Service and Privacy Policy',
					rules: [ValidationPresets.required('You must agree to the terms')],
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
