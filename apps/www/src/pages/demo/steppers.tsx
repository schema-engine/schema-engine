import { FormEngineLayout } from '@/layouts/form-engine-layout';
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import type { FormConfig } from '@json-form-engine/core';

// Import registries - now marked as sideEffects in package.json
import '@json-form-engine/react/components/form/registry';
import '@json-form-engine/react/components/examples/layout-stepper-examples';

// Simple wizard forms to test different steppers
const progressBarStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'progress-stepper-demo',
	title: 'Progress Bar Stepper Demo',
	description: 'Testing the progress bar stepper system',

	// Using registry-based stepper
	stepper: {
		__stepperId: 'progress-bar',
		showStepNumbers: true,
		showProgress: true,
		theme: 'blue',
	},

	steps: [
		{
			id: 'step1',
			title: 'Personal Info',
			description: 'Tell us about yourself',

			elements: [
				{
					id: 'firstName',
					componentId: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'John',
					required: true,
				},
				{
					id: 'lastName',
					componentId: 'input',
					inputType: 'text',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Doe',
					required: true,
				},
			],
		},
		{
			id: 'step2',
			title: 'Contact Details',
			description: 'How can we reach you?',

			elements: [
				{
					id: 'email',
					componentId: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'john.doe@example.com',
					required: true,
				},
				{
					id: 'phone',
					componentId: 'input',
					inputType: 'tel',
					name: 'phone',
					label: 'Phone Number',
					placeholder: '+1 (555) 123-4567',
				},
			],
		},
		{
			id: 'step3',
			title: 'Preferences',
			description: 'Final settings',

			elements: [
				{
					id: 'newsletter',
					componentId: 'checkbox',
					name: 'newsletter',
					label: 'Subscribe to newsletter',
					defaultValue: false,
				},
				{
					id: 'notifications',
					componentId: 'radio',
					name: 'notifications',
					label: 'Notification Preference',
					options: [
						{ value: 'all', label: 'All notifications' },
						{ value: 'important', label: 'Important only' },
						{ value: 'none', label: 'No notifications' },
					],
					defaultValue: 'important',
				},
			],
		},
	],
};

const verticalStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'vertical-stepper-demo',
	title: 'Vertical Stepper Demo',
	description: 'Testing the vertical stepper system',

	// Using registry-based stepper
	stepper: {
		__stepperId: 'vertical',
		showDescriptions: true,
		allowClickNavigation: true,
		connectorStyle: 'line',
	},

	steps: [
		{
			id: 'step1',
			title: 'Account Setup',
			description: 'Create your account',

			elements: [
				{
					id: 'username',
					componentId: 'input',
					inputType: 'text',
					name: 'username',
					label: 'Username',
					placeholder: 'Choose a username',
					required: true,
				},
				{
					id: 'password',
					componentId: 'input',
					inputType: 'password',
					name: 'password',
					label: 'Password',
					placeholder: 'Create a strong password',
					required: true,
				},
			],
		},
		{
			id: 'step2',
			title: 'Profile Information',
			description: 'Complete your profile',

			elements: [
				{
					id: 'displayName',
					componentId: 'input',
					inputType: 'text',
					name: 'displayName',
					label: 'Display Name',
					placeholder: 'How others will see you',
				},
				{
					id: 'bio',
					componentId: 'textarea',
					name: 'bio',
					label: 'Bio',
					placeholder: 'Tell us about yourself...',
					rows: 3,
				},
			],
		},
	],
};

const minimalistStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'minimalist-stepper-demo',
	title: 'Minimalist Stepper Demo',
	description: 'Testing the minimalist stepper system',

	// Using registry-based stepper
	stepper: {
		__stepperId: 'minimalist',
		showOnlyActiveStep: true,
		hideStepNumbers: true,
		compactMode: true,
	},

	steps: [
		{
			id: 'step1',
			title: 'Quick Survey',

			elements: [
				{
					id: 'satisfaction',
					componentId: 'radio',
					name: 'satisfaction',
					label: 'How satisfied are you?',
					options: [
						{ value: '1', label: 'Very Unsatisfied' },
						{ value: '2', label: 'Unsatisfied' },
						{ value: '3', label: 'Neutral' },
						{ value: '4', label: 'Satisfied' },
						{ value: '5', label: 'Very Satisfied' },
					],
					required: true,
				},
			],
		},
		{
			id: 'step2',
			title: 'Feedback',

			elements: [
				{
					id: 'comments',
					componentId: 'textarea',
					name: 'comments',
					label: 'Additional Comments',
					placeholder: 'Any suggestions or feedback?',
					rows: 4,
				},
			],
		},
	],
};

// Traditional stepper (simpler stepper) for comparison
const traditionalStepperDemo: FormConfig = {
	mode: 'wizard',
	id: 'traditional-stepper-demo',
	title: 'Simple Stepper Demo',
	description: 'Testing simple stepper configuration',

	// Use minimalist stepper for simple configuration
	stepper: {
		__stepperId: 'minimalist',
		variant: 'numbers',
		size: 'medium',
	},

	steps: [
		{
			id: 'step1',
			title: 'Basic Info',

			elements: [
				{
					id: 'name',
					componentId: 'input',
					inputType: 'text',
					name: 'name',
					label: 'Name',
					placeholder: 'Enter your name',
					required: true,
				},
			],
		},
		{
			id: 'step2',
			title: 'Confirmation',

			elements: [
				{
					id: 'confirm',
					componentId: 'checkbox',
					name: 'confirm',
					label: 'I confirm the information is correct',
					required: true,
				},
			],
		},
	],
};

export default function SteppersPage() {
	return (
		<FormEngineLayout>
			<div className="min-h-screen bg-gray-50 py-12">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">Pure Steppers Demo</h1>
						<p className="text-xl text-gray-600 max-w-2xl mx-auto">
							Testing different stepper systems in isolation to verify functionality
						</p>
					</div>

					<div className="space-y-12">
						{/* Traditional Stepper - Should Always Work */}
						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">
									1. Simple Stepper (Baseline Test)
								</h2>
								<p className="text-gray-600">Simple stepper with numbers - this should always work</p>
							</div>
							<FormRenderer config={traditionalStepperDemo} />
						</div>

						{/* Progress Bar Stepper */}
						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">2. Progress Bar Stepper</h2>
								<p className="text-gray-600">Registry-based stepper with __stepperId: 'progress-bar'</p>
							</div>
							<FormRenderer config={progressBarStepperDemo} />
						</div>

						{/* Vertical Stepper */}
						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">3. Vertical Stepper</h2>
								<p className="text-gray-600">Registry-based stepper with __stepperId: 'vertical'</p>
							</div>
							<FormRenderer config={verticalStepperDemo} />
						</div>

						{/* Minimalist Stepper */}
						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">4. Minimalist Stepper</h2>
								<p className="text-gray-600">Registry-based stepper with __stepperId: 'minimalist'</p>
							</div>
							<FormRenderer config={minimalistStepperDemo} />
						</div>
					</div>

					{/* Debug Information */}
					<div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold text-blue-800 mb-3">Debug Information</h3>
						<div className="text-sm text-blue-700 space-y-2">
							<p>
								<strong>Expected behavior:</strong>
							</p>
							<ul className="list-disc list-inside ml-4 space-y-1">
								<li>Simple stepper should show numbers (baseline)</li>
								<li>Progress bar stepper should show numbered steps with blue theme</li>
								<li>Vertical stepper should stack steps vertically with descriptions</li>
								<li>Minimalist stepper should show only active step in compact mode</li>
							</ul>
							<p className="mt-3">
								<strong>Wizard mode features to test:</strong>
							</p>
							<ul className="list-disc list-inside ml-4 space-y-1">
								<li>Navigation between steps (Next/Previous buttons)</li>
								<li>Form validation before proceeding to next step</li>
								<li>Step completion tracking</li>
								<li>Final form submission</li>
							</ul>
							<p className="mt-3">
								<strong>If steppers don't work:</strong> Check browser console for errors and verify
								stepper registry is loaded.
							</p>
						</div>
					</div>
				</div>
			</div>
		</FormEngineLayout>
	);
}
