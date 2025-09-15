import { ValidationPresets } from "@json-form-engine/core/schemas/validation";	
import type { FormConfig } from "@json-form-engine/core/schemas";

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
					componentId: 'select',
					id: 'user-type',
					name: 'userType',
					label: 'User Type',
					rules: [ValidationPresets.required('Please select a user type')],
					options: [
						{ value: 'individual', label: 'Individual' },
						{ value: 'business', label: 'Business' },
						{ value: 'nonprofit', label: 'Non-Profit' },
					],
					defaultValue: 'individual',
				},

				{
					componentId: 'input',
					inputType: 'text',
					id: 'first-name',
					name: 'firstName',
					label: 'First Name',
					rules: [ValidationPresets.required('First name is required')],
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
					componentId: 'input',
					inputType: 'text',
					id: 'last-name',
					name: 'lastName',
					label: 'Last Name',
					rules: [ValidationPresets.required('Last name is required')],
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
					componentId: 'input',
					inputType: 'text',
					id: 'company-name',
					name: 'companyName',
					label: 'Company Name',
					rules: [ValidationPresets.required('Company name is required')],
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
					componentId: 'select',
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
					componentId: 'input',
					inputType: 'text',
					id: 'organization-name',
					name: 'organizationName',
					label: 'Organization Name',
					rules: [ValidationPresets.required('Organization name is required')],
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
					componentId: 'input',
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
					componentId: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					rules: [
						ValidationPresets.required('Email is required'),
						ValidationPresets.email('Please enter a valid email address'),
					],
				},
				{
					componentId: 'input',
					inputType: 'tel',
					id: 'phone',
					name: 'phone',
					label: 'Phone Number',
					rules: [ValidationPresets.required('Phone number is required')],
				},
				{
					componentId: 'checkbox',
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
					componentId: 'select',
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
					componentId: 'arrayElements',
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
