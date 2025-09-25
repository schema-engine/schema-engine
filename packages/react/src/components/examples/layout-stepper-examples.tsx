import { registerLayout, registerStepper } from '../layout-stepper-registry';
import { SplitScreenLayout, HeroBackgroundLayout, CardLayout } from '../layouts/example-layouts';
import { ProgressBarStepper, VerticalStepsStepper, MinimalistStepper } from '../steppers/example-steppers';

/**
 * Register example layout components
 */

// Split Screen Layout
registerLayout({
	layoutId: 'split-screen',
	name: 'Split Screen Layout',
	description: 'Display form content alongside additional information or media',
	component: SplitScreenLayout,
	defaultConfig: {
		sidePlacement: 'left',
		sideWidth: '50%',
		backgroundColor: '#f8f9fa',
		sideContent: '<h3>Welcome!</h3><p>Please fill out this form to continue.</p>',
	},
});

// Hero Background Layout
registerLayout({
	layoutId: 'hero-background',
	name: 'Hero Background Layout',
	description: 'Display form content over a background image or video',
	component: HeroBackgroundLayout,
	defaultConfig: {
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		contentWidth: '600px',
		textColor: 'white',
	},
});

// Card Layout
registerLayout({
	layoutId: 'card',
	name: 'Card Layout',
	description: 'Display form content in a centered card',
	component: CardLayout,
	defaultConfig: {
		maxWidth: '500px',
		padding: '2rem',
		backgroundColor: 'white',
		shadowSize: 'medium',
	},
});

/**
 * Register example stepper components
 */

// Progress Bar Stepper
registerStepper({
	stepperId: 'progress-bar',
	name: 'Progress Bar Stepper',
	description: 'Show progress as a horizontal progress bar with step indicators',
	component: ProgressBarStepper,
	defaultConfig: {
		showStepNumbers: true,
		showStepTitles: true,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
		backgroundColor: '#e5e7eb',
	},
});

// Vertical Steps Stepper
registerStepper({
	stepperId: 'vertical',
	name: 'Vertical Steps Stepper',
	description: 'Show steps as a vertical timeline',
	component: VerticalStepsStepper,
	defaultConfig: {
		showConnectors: true,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
		backgroundColor: '#e5e7eb',
	},
});

// Minimalist Stepper
registerStepper({
	stepperId: 'minimalist',
	name: 'Minimalist Stepper',
	description: 'Simple text-based navigation',
	component: MinimalistStepper,
	defaultConfig: {
		showProgress: true,
		primaryColor: '#3b82f6',
	},
});

/**
 * Example form configuration using layouts and steppers
 */
export const exampleFormWithLayoutsAndSteppers = {
	id: 'user-registration-flow',
	title: 'Create Your Account',
	description: 'Join our platform in just a few simple steps',

	// Custom stepper configuration
	stepper: {
		__stepperId: 'progress-bar',
		showStepTitles: true,
		primaryColor: '#6366f1',
		completedColor: '#059669',
	},

	steps: [
		{
			id: 'personal-information',
			title: 'Personal Information',
			description: 'Tell us about yourself',

			// Custom layout for this step
			layout: {
				__layoutId: 'card',
				maxWidth: '600px',
				shadowSize: 'large',
			},

			elements: [
				{
					type: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'Enter your first name',
					validation: [{ type: 'required', message: 'First name is required' }],
				},
				{
					type: 'input',
					inputType: 'text',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					validation: [{ type: 'required', message: 'Last name is required' }],
				},
				{
					type: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					validation: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Please enter a valid email' },
					],
				},
			],
		},
		{
			id: 'account-details',
			title: 'Account Details',
			description: 'Choose your username and password',

			// Different layout for this step
			layout: {
				__layoutId: 'split-screen',
				sidePlacement: 'right',
				sideWidth: '40%',
				backgroundColor: '#f1f5f9',
				sideContent:
					'<h3>Security Tips</h3><ul><li>Use a strong password</li><li>Include numbers and symbols</li><li>Make it at least 8 characters</li></ul>',
			},

			elements: [
				{
					type: 'input',
					inputType: 'text',
					name: 'username',
					label: 'Username',
					placeholder: 'Choose a username',
					validation: [
						{ type: 'required', message: 'Username is required' },
						{ type: 'minLength', value: 3, message: 'Username must be at least 3 characters' },
					],
				},
				{
					type: 'input',
					inputType: 'password',
					name: 'password',
					label: 'Password',
					placeholder: 'Create a password',
					validation: [
						{ type: 'required', message: 'Password is required' },
						{ type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
					],
				},
				{
					type: 'input',
					inputType: 'password',
					name: 'confirmPassword',
					label: 'Confirm Password',
					placeholder: 'Confirm your password',
					validation: [{ type: 'required', message: 'Please confirm your password' }],
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',
			description: 'Customize your experience',

			// Hero background layout for final step
			layout: {
				__layoutId: 'hero-background',
				backgroundImage:
					'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80',
				contentWidth: '500px',
			},

			elements: [
				{
					type: 'checkbox',
					name: 'newsletter',
					label: 'Subscribe to our newsletter',
					defaultValue: false,
				},
				{
					type: 'radio',
					name: 'theme',
					label: 'Choose your theme',
					options: [
						{ value: 'light', label: 'Light Theme' },
						{ value: 'dark', label: 'Dark Theme' },
						{ value: 'auto', label: 'Auto (System)' },
					],
					defaultValue: 'light',
				},
				{
					type: 'select',
					name: 'language',
					label: 'Preferred Language',
					options: [
						{ value: 'en', label: 'English' },
						{ value: 'es', label: 'Español' },
						{ value: 'fr', label: 'Français' },
						{ value: 'de', label: 'Deutsch' },
					],
					defaultValue: 'en',
				},
			],
		},
	],
};

/**
 * Alternative form configuration with different layouts and stepper
 */
export const alternativeFormConfig = {
	id: 'contact-form',
	title: 'Get in Touch',
	description: "We'd love to hear from you",

	// Different stepper style
	stepper: {
		__stepperId: 'minimalist',
		primaryColor: '#059669',
	},

	steps: [
		{
			id: 'contact-info',
			title: 'Contact Information',

			// Simple card layout
			layout: {
				__layoutId: 'card',
				maxWidth: '400px',
				shadowSize: 'small',
			},

			elements: [
				{
					type: 'input',
					inputType: 'text',
					name: 'name',
					label: 'Your Name',
					validation: [{ type: 'required' }],
				},
				{
					type: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email Address',
					validation: [{ type: 'required' }, { type: 'email' }],
				},
			],
		},
		{
			id: 'message',
			title: 'Your Message',

			// No custom layout - will use default
			elements: [
				{
					type: 'select',
					name: 'subject',
					label: 'Subject',
					options: [
						{ value: 'general', label: 'General Inquiry' },
						{ value: 'support', label: 'Technical Support' },
						{ value: 'sales', label: 'Sales Question' },
						{ value: 'feedback', label: 'Feedback' },
					],
				},
				{
					type: 'textarea',
					name: 'message',
					label: 'Message',
					placeholder: "Tell us what's on your mind...",
					validation: [{ type: 'required' }],
				},
			],
		},
	],
};
