import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@/lib/form-engine-setup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const stepperDemoConfig: FormConfig = {
	id: 'stepper-demo',
	title: 'Multi-Step Form Demo',
	description: 'Experience different stepper styles and navigation patterns',
	mode: 'wizard',

	steps: [
		{
			id: 'basic-info',
			title: 'Basic Information',
			description: "Let's start with the basics",
			icon: '👤',
			elements: [
				{
					id: 'name',
					componentId: 'input',
					inputType: 'text',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your full name',
					rules: [
						ValidationPresets.string.required('Name is required'),
						ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
					],
				},
				{
					id: 'email',
					componentId: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'your@email.com',
					rules: [
						ValidationPresets.string.required('Email is required'),
						ValidationPresets.string.email('Please enter a valid email address'),
					],
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',
			description: 'Tell us about your preferences',
			icon: '⚙️',
			elements: [
				{
					id: 'role',
					componentId: 'select',
					name: 'role',
					label: 'Your Role',
					placeholder: 'Select your role',

					options: [
						{ label: 'Developer', value: 'developer' },
						{ label: 'Designer', value: 'designer' },
						{ label: 'Product Manager', value: 'pm' },
						{ label: 'Other', value: 'other' },
					],
					rules: [ValidationPresets.string.required('Please select your role')],
				},

				{
					id: 'experience',
					componentId: 'select',
					name: 'experience',
					label: 'Experience Level',
					placeholder: 'Select your experience',
					options: [
						{ label: 'Beginner (0-1 years)', value: 'beginner' },
						{ label: 'Intermediate (2-4 years)', value: 'intermediate' },
						{ label: 'Advanced (5+ years)', value: 'advanced' },
					],
					defaultValue: 'intermediate',
				},
			],
		},
		{
			id: 'details',
			title: 'Additional Details',
			description: 'Optional additional information',
			icon: '📝',
			elements: [
				{
					id: 'company',
					componentId: 'input',
					inputType: 'text',
					name: 'company',
					label: 'Company (Optional)',
					placeholder: 'Your company name',
				},
				{
					id: 'feedback',
					componentId: 'textarea',
					name: 'feedback',
					label: 'Feedback',
					placeholder: 'Any feedback about this demo? (Optional)',
					rows: 4,
				},
				{
					id: 'newsletter',
					componentId: 'checkbox',
					name: 'newsletter',
					label: 'Subscribe to newsletter for updates',
					defaultValue: true,
				},
			],
		},
	],

	stepper: {
		stepperId: 'default',
		variant: 'default',
		orientation: 'horizontal',
		position: 'top',
		showStepNumbers: true,
		showStepTitles: true,
		allowStepJumping: false,
		validateOnNext: true,
		buttons: {
			previous: {
				label: 'Back',
				variant: 'outline',
			},
			next: {
				label: 'Continue',
				variant: 'primary',
			},
			submit: {
				label: 'Complete Demo',
				variant: 'primary',
			},
		},
	},

	grid: {
		columns: 1,
		gap: '1.5rem',
	},

	actions: [
		{
			id: 'submit',
			type: 'submit',
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST',
			successMessage: 'Demo completed successfully! Thanks for trying it out.',
			errorMessage: 'Demo submission failed. Please try again.',
			triggers: ['form_submit'],
		},
	],
};

const verticalStepperConfig: FormConfig = {
	...stepperDemoConfig,
	id: 'vertical-stepper-demo',
	stepper: {
		stepperId: 'default',
		variant: 'default',
		orientation: 'vertical',
		position: 'left',
		showStepNumbers: true,
		showStepTitles: true,
		allowStepJumping: false,
		validateOnNext: true,
		buttons: {
			previous: {
				label: 'Back',
				variant: 'outline',
			},
			next: {
				label: 'Continue',
				variant: 'primary',
			},
			submit: {
				label: 'Complete Demo',
				variant: 'primary',
			},
		},
	},
};

const minimalStepperConfig: FormConfig = {
	...stepperDemoConfig,
	id: 'minimal-stepper-demo',
	stepper: {
		stepperId: 'minimalist',
		variant: 'dots',
		orientation: 'horizontal',
		position: 'top',
		showStepNumbers: false,
		showStepTitles: false,
		allowStepJumping: true,
		validateOnNext: false,
		buttons: {
			previous: {
				label: 'Back',
				variant: 'outline',
			},
			next: {
				label: 'Continue',
				variant: 'primary',
			},
			submit: {
				label: 'Complete Demo',
				variant: 'primary',
			},
		},
	},
};

export function MultiStepDemo() {
	const [activeVariant, setActiveVariant] = useState<'default' | 'vertical' | 'minimal'>('default');

	const getConfig = () => {
		switch (activeVariant) {
			case 'vertical':
				return verticalStepperConfig;
			case 'minimal':
				return minimalStepperConfig;
			default:
				return stepperDemoConfig;
		}
	};

	const handleSubmit = (data: any) => {
		console.log('Multi-step form submitted:', data);
		alert('This is the alert added manually in the demo! Form submitted successfully!');
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-center space-x-2">
				<Button
					size="sm"
					variant={activeVariant === 'default' ? 'default' : 'outline'}
					onClick={() => setActiveVariant('default')}
				>
					Default Stepper
				</Button>
				<Button
					size="sm"
					variant={activeVariant === 'vertical' ? 'default' : 'outline'}
					onClick={() => setActiveVariant('vertical')}
				>
					Vertical Stepper
				</Button>
				<Button
					size="sm"
					variant={activeVariant === 'minimal' ? 'default' : 'outline'}
					onClick={() => setActiveVariant('minimal')}
				>
					Minimal Stepper
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>
						{activeVariant === 'default' && 'Horizontal Stepper Demo'}
						{activeVariant === 'vertical' && 'Vertical Stepper Demo'}
						{activeVariant === 'minimal' && 'Minimal Stepper Demo'}
					</CardTitle>
					<CardDescription>
						{activeVariant === 'default' && 'Traditional horizontal stepper with step numbers and titles'}
						{activeVariant === 'vertical' && 'Space-efficient vertical stepper, perfect for mobile'}
						{activeVariant === 'minimal' && 'Clean minimal stepper with free navigation between steps'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FormRenderer config={getConfig()} onSubmit={handleSubmit} />
				</CardContent>
			</Card>
		</div>
	);
}
