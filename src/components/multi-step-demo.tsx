import { FormEngineProvider, FormRenderer } from '@/lib/form-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidationPresets } from '@/lib/form-engine/validation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import '@/components/form/registry';

// Stepper Demo Configuration - showcases different stepper features
const stepperDemoConfig = {
	id: 'stepper-demo',
	title: 'Multi-Step Form Demo',
	description: 'Experience different stepper styles and navigation patterns',
	mode: 'wizard' as const,
	autoGenerateSchema: true,

	steps: [
		{
			id: 'basic-info',
			title: 'Basic Information',
			description: "Let's start with the basics",
			icon: '👤',
			fields: [
				{
					id: 'name',
					type: 'input' as const,
					inputType: 'text' as const,
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your full name',
					required: true,
					validation: [
						ValidationPresets.required('Name is required'),
						ValidationPresets.minLength(2, 'Name must be at least 2 characters'),
					],
				},
				{
					id: 'email',
					type: 'input' as const,
					inputType: 'email' as const,
					name: 'email',
					label: 'Email Address',
					placeholder: 'your@email.com',
					required: true,
					validation: [
						ValidationPresets.required('Email is required'),
						ValidationPresets.email('Please enter a valid email address'),
					],
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',
			description: 'Tell us about your preferences',
			icon: '⚙️',
			fields: [
				{
					id: 'role',
					type: 'select' as const,
					name: 'role',
					label: 'Your Role',
					placeholder: 'Select your role',
					required: true,
					options: [
						{ label: 'Developer', value: 'developer' },
						{ label: 'Designer', value: 'designer' },
						{ label: 'Product Manager', value: 'pm' },
						{ label: 'Other', value: 'other' },
					],
					validation: [ValidationPresets.required('Please select your role')],
				},
				{
					id: 'experience',
					type: 'select' as const,
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
			fields: [
				{
					id: 'company',
					type: 'input' as const,
					inputType: 'text' as const,
					name: 'company',
					label: 'Company (Optional)',
					placeholder: 'Your company name',
				},
				{
					id: 'feedback',
					type: 'textarea' as const,
					name: 'feedback',
					label: 'Feedback',
					placeholder: 'Any feedback about this demo? (Optional)',
					props: {
						rows: 4,
					},
				},
				{
					id: 'newsletter',
					type: 'checkbox' as const,
					name: 'newsletter',
					label: 'Subscribe to newsletter for updates',
					defaultValue: true,
				},
			],
		},
	],

	stepper: {
		variant: 'default' as const,
		orientation: 'horizontal' as const,
		position: 'top' as const,
		showStepNumbers: true,
		showStepTitles: true,
		allowStepJumping: false,
		validateOnNext: true,
		buttons: {
			previous: {
				label: 'Back',
				variant: 'outline' as const,
			},
			next: {
				label: 'Continue',
				variant: 'default' as const,
			},
			submit: {
				label: 'Complete Demo',
				variant: 'default' as const,
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
			type: 'submit' as const,
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST' as const,
			successMessage: 'Demo completed successfully! Thanks for trying it out.',
			errorMessage: 'Demo submission failed. Please try again.',
		},
	],
};

// Vertical stepper variant
const verticalStepperConfig = {
	...stepperDemoConfig,
	id: 'vertical-stepper-demo',
	stepper: {
		...stepperDemoConfig.stepper,
		orientation: 'vertical' as const,
		position: 'left' as const,
	},
};

// Minimal stepper variant
const minimalStepperConfig = {
	...stepperDemoConfig,
	id: 'minimal-stepper-demo',
	stepper: {
		variant: 'minimal' as const,
		orientation: 'horizontal' as const,
		position: 'top' as const,
		showStepNumbers: false,
		showStepTitles: false,
		allowStepJumping: true,
		validateOnNext: false,
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
		alert('Multi-step form completed! Check the console for details.');
	};

	return (
		<div className="space-y-6">
			{/* Variant Selector */}
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

			{/* Demo Form */}
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
					<FormEngineProvider>
						<FormRenderer config={getConfig()} onSubmit={handleSubmit} />
					</FormEngineProvider>
				</CardContent>
			</Card>
		</div>
	);
}
