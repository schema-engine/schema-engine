import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * Conditional form demo configuration
 */
export const conditionalFormConfig: FormConfig = {
	id: 'conditional-demo-form',
	title: 'Advanced Form Engine Demo',
	description: 'Showcasing conditional logic, array fields, and tree-shakable registries',

	mode: 'free',
	steps: [
		{
			id: 'conditional-step',
			title: 'Form with Conditional Logic',
			elements: [
				{
					$type: 'select',
					id: 'user-type',
					name: 'userType',
					label: 'User Type',
					rules: [ValidationPresets.string.required('Please select a user type')],
					options: [
						{ value: 'individual', label: 'Individual' },
						{ value: 'business', label: 'Business' },
						{ value: 'nonprofit', label: 'Non-Profit' },
					],
					defaultValue: 'individual',
				},

				{
					$type: 'input',
					inputType: 'text',
					id: 'first-name',
					name: 'firstName',
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
					$type: 'input',
					inputType: 'text',
					id: 'last-name',
					name: 'lastName',
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
					$type: 'input',
					inputType: 'text',
					id: 'company-name',
					name: 'companyName',
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
					$type: 'select',
					id: 'company-size',
					name: 'companySize',
					label: 'Company Size',
					options: [
						{ value: 'startup', label: 'Startup (1-10 employees)' },
						{ value: 'small', label: 'Small Business (11-50 employees)' },
						{ value: 'medium', label: 'Medium Business (51-250 employees)' },
						{ value: 'large', label: 'Large Enterprise (250+ employees)' },
					],
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
					$type: 'input',
					inputType: 'text',
					id: 'organization-name',
					name: 'organizationName',
					label: 'Organization Name',
					rules: [ValidationPresets.string.required('Organization name is required')],
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'nonprofit',
							action: 'show',
						},
					],
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'tax-id',
					name: 'taxId',
					label: 'Tax ID / EIN',
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'nonprofit',
							action: 'show',
						},
					],
				},
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email address'),
					],
				},
				{
					$type: 'input',
					inputType: 'tel',
					id: 'phone',
					name: 'phone',
					label: 'Phone Number',
					rules: [ValidationPresets.string.required('Phone number is required')],
				},
				{
					$type: 'checkbox',
					id: 'premium-features',
					name: 'premiumFeatures',
					label: 'Enable Premium Features',
					constraints: [
						{
							field: 'userType',
							operator: 'not_equals',
							value: 'individual',
							action: 'show',
						},
					],
				},
				{
					$type: 'select',
					id: 'premium-plan',
					name: 'premiumPlan',
					label: 'Premium Plan',
					options: [
						{ value: 'basic', label: 'Basic Plan - $29/month' },
						{ value: 'professional', label: 'Professional Plan - $99/month' },
						{ value: 'enterprise', label: 'Enterprise Plan - $299/month' },
					],
					constraints: [
						{
							field: 'premiumFeatures',
							operator: 'equals',
							value: true,
							action: 'show',
						},
					],
				},
				{
					$type: 'arrayElements',
					id: 'team-members',
					name: 'teamMembers',
					label: 'Team Members',
					description: 'Add key team members',
					minItems: 1,
					maxItems: 10,
					constraints: [
						{
							field: 'userType',
							operator: 'equals',
							value: 'business',
							action: 'show',
						},
					],
					elements: [
						{
							$type: 'input',
							inputType: 'text',
							id: 'member-name',
							name: 'name',
							label: 'Full Name',
							rules: [ValidationPresets.string.required('Name is required')],
						},
						{
							$type: 'input',
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
							$type: 'select',
							id: 'member-role',
							name: 'role',
							label: 'Role',
							options: [
								{ value: 'owner', label: 'Owner' },
								{ value: 'manager', label: 'Manager' },
								{ value: 'employee', label: 'Employee' },
								{ value: 'contractor', label: 'Contractor' },
							],
						},
					],
				},
				{
					$type: 'checkbox',
					id: 'terms-agreement',
					name: 'termsAgreement',
					label: 'I agree to the Terms of Service and Privacy Policy',
					rules: [ValidationPresets.boolean.required('You must agree to the terms')],
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
			id: 'conditional-form-submit',
			type: 'submit',
			description: 'Submit conditional form',
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
