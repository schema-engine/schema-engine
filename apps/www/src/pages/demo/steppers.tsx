import { FormEngineLayout } from '@/layouts/form-engine-layout';
import type { FormConfig } from '@schema-engine/forms';
import type { ReactNode } from 'react';
import type { EcoComponent } from '@ecopages/core';
import { FormRenderer } from '@schema-engine/forms-react/components/internals/form-renderer';
import '@/lib/form-engine-setup';

const minimalistStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'minimalist-stepper-demo',
	title: 'User Registration',
	description: 'Complete your profile setup in 3 simple steps',
	stepper: {
		$type: 'minimalist',
		showProgress: true,
	},
	steps: [
		{
			id: 'account',
			title: 'Create Account',
			description: 'Set up your login credentials',
			elements: [
				{
					id: 'email',
					$type: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your.email@example.com',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Please enter a valid email address' },
					],
				},
				{
					id: 'password',
					$type: 'input',
					inputType: 'password',
					name: 'password',
					label: 'Password',
					placeholder: 'Create a strong password',
					rules: [
						{ type: 'required', message: 'Password is required' },
						{ type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
						{
							type: 'pattern',
							value: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
							message: 'Password must contain uppercase, lowercase, and number',
						},
					],
				},
				{
					id: 'confirmPassword',
					$type: 'input',
					inputType: 'password',
					name: 'confirmPassword',
					label: 'Confirm Password',
					placeholder: 'Re-enter your password',
					rules: [{ type: 'required', message: 'Please confirm your password' }],
				},
			],
		},
		{
			id: 'profile',
			title: 'Personal Information',
			description: 'Tell us about yourself',
			elements: [
				{
					id: 'firstName',
					$type: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'John',
					rules: [
						{ type: 'required', message: 'First name is required' },
						{ type: 'minLength', value: 2, message: 'First name must be at least 2 characters' },
						{ type: 'maxLength', value: 50, message: 'First name cannot exceed 50 characters' },
					],
				},
				{
					id: 'lastName',
					$type: 'input',
					inputType: 'text',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Doe',
					rules: [
						{ type: 'required', message: 'Last name is required' },
						{ type: 'minLength', value: 2, message: 'Last name must be at least 2 characters' },
						{ type: 'maxLength', value: 50, message: 'Last name cannot exceed 50 characters' },
					],
				},
				{
					id: 'age',
					$type: 'number',
					name: 'age',
					label: 'Age',
					placeholder: '25',
					rules: [
						{ type: 'required', message: 'Age is required' },
						{ type: 'min', value: 13, message: 'You must be at least 13 years old' },
						{ type: 'max', value: 120, message: 'Please enter a valid age' },
					],
				},
			],
		},
		{
			id: 'preferences',
			title: 'Final Setup',
			description: 'Customize your experience',
			elements: [
				{
					id: 'website',
					$type: 'input',
					inputType: 'url',
					name: 'website',
					label: 'Personal Website (Optional)',
					placeholder: 'https://yourwebsite.com',
					rules: [{ type: 'url', message: 'Please enter a valid URL' }],
				},
				{
					id: 'newsletter',
					$type: 'checkbox',
					name: 'newsletter',
					label: 'Subscribe to our newsletter for updates',
					defaultValue: true,
				},
				{
					id: 'terms',
					$type: 'checkbox',
					name: 'terms',
					label: 'I agree to the Terms of Service and Privacy Policy',
					rules: [{ type: 'required', message: 'You must accept the terms to continue' }],
				},
			],
		},
	],
};

const verticalStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'vertical-stepper-demo',
	title: 'Event Registration',
	description: 'Register for our upcoming conference',
	stepper: {
		$type: 'default',
		orientation: 'horizontal',
	},
	steps: [
		{
			id: 'attendee-info',
			title: 'Attendee Information',
			description: 'Your personal details for the event',
			elements: [
				{
					id: 'fullName',
					$type: 'input',
					inputType: 'text',
					name: 'fullName',
					label: 'Full Name',
					placeholder: 'John Doe',
					rules: [
						{ type: 'required', message: 'Full name is required' },
						{ type: 'minLength', value: 3, message: 'Name must be at least 3 characters' },
						{
							type: 'pattern',
							value: '^[a-zA-Z\\s]+$',
							message: 'Name can only contain letters and spaces',
						},
					],
				},
				{
					id: 'company',
					$type: 'input',
					inputType: 'text',
					name: 'company',
					label: 'Company/Organization',
					placeholder: 'Acme Corporation',
					rules: [
						{ type: 'required', message: 'Company name is required' },
						{ type: 'minLength', value: 2, message: 'Company name must be at least 2 characters' },
					],
				},
				{
					id: 'jobTitle',
					$type: 'input',
					inputType: 'text',
					name: 'jobTitle',
					label: 'Job Title',
					placeholder: 'Software Engineer',
					rules: [{ type: 'required', message: 'Job title is required' }],
				},
			],
		},
		{
			id: 'session-selection',
			title: 'Session Selection',
			description: 'Choose the sessions you want to attend',
			elements: [
				{
					id: 'sessions',
					$type: 'radio',
					name: 'sessions',
					label: 'Conference Sessions',
					options: [
						{ value: 'keynote', label: 'Opening Keynote: Future of Technology' },
						{ value: 'ai-workshop', label: 'AI & Machine Learning Workshop' },
						{ value: 'web-dev', label: 'Modern Web Development Trends' },
						{ value: 'security', label: 'Cybersecurity Best Practices' },
						{ value: 'cloud', label: 'Cloud Architecture Patterns' },
						{ value: 'networking', label: 'Networking & Career Panel' },
					],
					rules: [
						{ type: 'required', message: 'Please select at least one session' },
						{ type: 'minItems', value: 1, message: 'You must select at least one session' },
						{ type: 'maxItems', value: 4, message: 'You can select a maximum of 4 sessions' },
					],
				},
			],
		},
		{
			id: 'dietary-requirements',
			title: 'Dietary Requirements',
			description: 'Help us cater to your needs',
			elements: [
				{
					id: 'dietaryRestrictions',
					$type: 'radio',
					name: 'dietaryRestrictions',
					label: 'Dietary Restrictions',
					options: [
						{ value: 'none', label: 'No restrictions' },
						{ value: 'vegetarian', label: 'Vegetarian' },
						{ value: 'vegan', label: 'Vegan' },
						{ value: 'gluten-free', label: 'Gluten-free' },
						{ value: 'other', label: 'Other (please specify below)' },
					],
					defaultValue: 'none',
				},
				{
					id: 'specialRequests',
					$type: 'textarea',
					name: 'specialRequests',
					label: 'Special Requests or Allergies',
					placeholder: 'Please describe any special dietary needs or allergies...',
					rows: 3,
					rules: [
						{ type: 'maxLength', value: 200, message: 'Special requests cannot exceed 200 characters' },
					],
				},
			],
		},
	],
};

const defaultStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'default-stepper-demo',
	title: 'Project Setup Wizard',
	description: 'Configure your new project step by step',
	stepper: {
		$type: 'default',
		orientation: 'horizontal',
	},
	steps: [
		{
			id: 'project-details',
			title: 'Project Details',
			description: 'Basic information about your project',
			elements: [
				{
					id: 'projectName',
					$type: 'input',
					inputType: 'text',
					name: 'projectName',
					label: 'Project Name',
					placeholder: 'My Awesome Project',
					rules: [
						{ type: 'required', message: 'Project name is required' },
						{ type: 'minLength', value: 3, message: 'Project name must be at least 3 characters' },
						{ type: 'maxLength', value: 100, message: 'Project name cannot exceed 100 characters' },
						{
							type: 'pattern',
							value: '^[a-zA-Z0-9\\s\\-_]+$',
							message: 'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
						},
					],
				},
				{
					id: 'description',
					$type: 'textarea',
					name: 'description',
					label: 'Project Description',
					placeholder: 'Describe what your project does...',
					rows: 4,
					rules: [
						{ type: 'required', message: 'Project description is required' },
						{ type: 'minLength', value: 20, message: 'Description must be at least 20 characters' },
						{ type: 'maxLength', value: 500, message: 'Description cannot exceed 500 characters' },
					],
				},
			],
		},
		{
			id: 'technical-config',
			title: 'Technical Configuration',
			description: 'Choose your technology stack',
			elements: [
				{
					id: 'framework',
					$type: 'select',
					name: 'framework',
					label: 'Frontend Framework',
					options: [
						{ value: 'react', label: 'React' },
						{ value: 'vue', label: 'Vue.js' },
						{ value: 'angular', label: 'Angular' },
						{ value: 'svelte', label: 'Svelte' },
						{ value: 'vanilla', label: 'Vanilla JavaScript' },
					],
					rules: [{ type: 'required', message: 'Please select a framework' }],
				},
				{
					id: 'features',
					$type: 'radio',
					name: 'features',
					label: 'Additional Features',
					options: [
						{ value: 'typescript', label: 'TypeScript Support' },
						{ value: 'testing', label: 'Testing Framework' },
						{ value: 'docker', label: 'Docker Configuration' },
						{ value: 'ci-cd', label: 'CI/CD Pipeline' },
					],
					rules: [{ type: 'minItems', value: 1, message: 'Please select at least one feature' }],
				},
			],
		},
		{
			id: 'deployment',
			title: 'Deployment Settings',
			description: 'Configure where your project will be deployed',
			elements: [
				{
					id: 'environment',
					$type: 'radio',
					name: 'environment',
					label: 'Target Environment',
					options: [
						{ value: 'development', label: 'Development Only' },
						{ value: 'staging', label: 'Staging Environment' },
						{ value: 'production', label: 'Production Ready' },
					],
					defaultValue: 'development',
				},
				{
					id: 'domain',
					$type: 'input',
					inputType: 'url',
					name: 'domain',
					label: 'Custom Domain (Optional)',
					placeholder: 'https://myproject.com',
					rules: [{ type: 'url', message: 'Please enter a valid URL' }],
				},
			],
		},
	],
};

const SteppersPage: EcoComponent<unknown, ReactNode> = () => {
	return (
		<FormEngineLayout>
			<div className="min-h-screen bg-gray-50 py-12">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">Stepper Components Showcase</h1>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Experience different stepper patterns with comprehensive validation rules and real-world
							scenarios
						</p>
					</div>

					<div className="space-y-16">
						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">1. Minimalist Stepper</h2>
								<p className="text-gray-600 mb-4">
									Clean, focused design with progress tracking - perfect for user onboarding flows
								</p>
								<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
									<h4 className="font-semibold text-emerald-800 mb-2">Validation Features:</h4>
									<ul className="text-sm text-emerald-700 space-y-1">
										<li>• Email format validation with custom messages</li>
										<li>• Password strength requirements (min length, complexity)</li>
										<li>• Age range validation (13-120 years)</li>
										<li>• URL format validation for optional website field</li>
										<li>• Required checkbox for terms acceptance</li>
									</ul>
								</div>
							</div>
							<FormRenderer config={minimalistStepperDemo} />
						</div>

						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">4. Default Stepper</h2>
								<p className="text-gray-600 mb-4">
									Basic numbered stepper - simple and effective for quick data collection
								</p>
								<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
									<h4 className="font-semibold text-gray-800 mb-2">Validation Features:</h4>
									<ul className="text-sm text-gray-700 space-y-1">
										<li>• Required radio button selections with star ratings</li>
										<li>• Optional multiple checkbox selections</li>
										<li>• Character limits for feedback text (max 1000 chars)</li>
										<li>• Permission checkbox for follow-up contact</li>
									</ul>
								</div>
							</div>
							<FormRenderer config={defaultStepperDemo} />
						</div>

						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-8">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">2. Vertical Stepper</h2>
								<p className="text-gray-600 mb-4">
									Vertical layout with detailed descriptions - excellent for complex workflows
								</p>
								<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
									<h4 className="font-semibold text-purple-800 mb-2">Validation Features:</h4>
									<ul className="text-sm text-purple-700 space-y-1">
										<li>• Name pattern validation (letters and spaces only)</li>
										<li>• Company and job title required field validation</li>
										<li>• Session selection with min/max limits (1-4 sessions)</li>
										<li>• Character count limits for text areas (max 200 chars)</li>
										<li>• Radio button default values and required validation</li>
									</ul>
								</div>
							</div>
							<FormRenderer config={verticalStepperDemo} />
						</div>
					</div>

					<div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
						<h3 className="text-xl font-semibold text-blue-900 mb-4">Wizard Mode Testing Guide</h3>
						<div className="grid md:grid-cols-2 gap-6 text-sm">
							<div>
								<h4 className="font-semibold text-blue-800 mb-2">Navigation Features:</h4>
								<ul className="text-blue-700 space-y-1">
									<li>• Step-by-step progression with validation</li>
									<li>• Previous/Next button state management</li>
									<li>• Submit button on final step</li>
									<li>• Form validation prevents invalid progression</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold text-blue-800 mb-2">Validation Testing:</h4>
								<ul className="text-blue-700 space-y-1">
									<li>• Try submitting empty required fields</li>
									<li>• Test pattern validation (email, URL, etc.)</li>
									<li>• Verify length constraints (min/max characters)</li>
									<li>• Check number range validation</li>
								</ul>
							</div>
						</div>
						<div className="mt-4 p-4 bg-blue-100 rounded-lg">
							<p className="text-blue-800 font-medium">
								Pro Tip: Each stepper demonstrates different validation patterns and user interaction
								flows. Try filling out forms incorrectly to see validation messages in action!
							</p>
						</div>
					</div>
				</div>
			</div>
		</FormEngineLayout>
	);
};

SteppersPage.config = {
	importMeta: import.meta,
};

export default SteppersPage;
