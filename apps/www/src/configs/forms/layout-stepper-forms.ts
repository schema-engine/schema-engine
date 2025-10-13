import type { FormConfig } from '@json-form-engine/core';

/**
 * Registry-based card layout with progress bar stepper
 * Uses the new registry system for both layouts and steppers
 *
 * Note: The stepper configuration is now strongly typed!
 * TypeScript will provide IntelliSense for progress-bar specific options.
 */
export const cardWithProgressBarForm: FormConfig = {
	mode: 'wizard',
	id: 'card-progress-form',
	title: 'Card Layout with Progress Bar',
	description: 'A multi-step form using registered card layout and progress bar stepper',

	// Registry-based stepper configuration - now strongly typed!
	stepper: {
		__id: 'progress-bar', // TypeScript knows this must be a valid stepper ID
		showLabels: true, // IntelliSense suggests valid options for progress-bar
		variant: 'default', // 'default' | 'compact' | 'minimal'
		showProgress: true, // Specific to progress-bar stepper
		animate: true, // Specific to progress-bar stepper
	},

	steps: [
		{
			id: 'personal-info',
			title: 'Personal Information',

			// Registry-based layout configuration for this step
			layout: {
				__id: 'card',
				padding: '1rem',
				shadow: true,
			},

			elements: [
				{
					id: 'firstName',
					__id: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'Enter your first name',
					rules: [{ type: 'required', message: 'First Name is required' }],
				},
				{
					id: 'lastName',
					__id: 'input',
					inputType: 'text',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Enter your last name',
					rules: [{ type: 'required', message: 'Last Name is required' }],
				},
			],
		},
		{
			id: 'contact-info',
			title: 'Contact Information',

			layout: {
				__id: 'card',
				padding: '1rem',
				shadow: true,
			},

			elements: [
				{
					id: 'email',
					__id: 'input',
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
					id: 'phone',
					__id: 'input',
					inputType: 'tel',
					name: 'phone',
					label: 'Phone Number',
					placeholder: '(555) 123-4567',
				},
			],
		},
	],
};

/**
 * Registry-based split screen layout with vertical stepper
 *
 * Note: Different steppers have different configuration options.
 * The vertical stepper has position, width, etc.
 */
export const splitScreenWithVerticalForm: FormConfig = {
	mode: 'wizard',
	id: 'split-vertical-form',
	title: 'Split Screen with Vertical Stepper',
	description: 'A multi-step form using split screen layout and vertical stepper',

	stepper: {
		__id: 'default',
		showLabels: true,
		showDescription: true,
		orientation: 'sidebar', // 'default' | 'compact' (specific to vertical)
		position: 'left', // 'left' | 'right' (specific to vertical)
		width: '300px', // Specific to vertical stepper
	},

	steps: [
		{
			id: 'account-setup',
			title: 'Account Setup',
			description: 'Create your account credentials',

			layout: {
				__id: 'split-screen',
				leftWidth: '50%',
				rightWidth: '50%',
			},

			elements: [
				{
					id: 'username',
					__id: 'input',
					inputType: 'text',
					name: 'username',
					label: 'Username',
					placeholder: 'Choose a unique username',
					rules: [{ type: 'required', message: 'Username is required' }],
				},
				{
					id: 'password',
					__id: 'input',
					inputType: 'password',
					name: 'password',
					label: 'Password',
					placeholder: 'Create a secure password',
					rules: [{ type: 'required', message: 'Password is required' }],
				},
			],
		},
		{
			id: 'profile-info',
			title: 'Profile Information',
			description: 'Tell us about yourself',

			layout: {
				__id: 'split-screen',
				leftWidth: '40%',
				rightWidth: '60%',
			},

			elements: [
				{
					id: 'bio',
					__id: 'textarea',
					name: 'bio',
					label: 'Biography',
					placeholder: 'Tell us about yourself...',
					rows: 4,
				},
				{
					id: 'main_interests',
					__id: 'radio',
					name: 'interests',
					label: 'Interests',
					options: [
						{ value: 'tech', label: 'Technology' },
						{ value: 'sports', label: 'Sports' },
						{ value: 'music', label: 'Music' },
					],
				},
			],
		},
	],
};

/**
 * Registry-based hero layout with minimalist stepper
 *
 * Note: Each stepper type has its own specific configuration interface.
 * No more [key: string]: any - everything is properly typed!
 */
export const heroWithMinimalistForm: FormConfig = {
	mode: 'free',
	id: 'hero-minimalist-form',
	title: 'Hero Layout with Minimalist Stepper',
	description: 'A multi-step form using hero layout and minimalist stepper',

	stepper: {
		__id: 'minimalist', // Type-safe stepper selection
		showLabels: false,
		variant: 'dots', // 'dots' | 'lines' | 'numbers' (minimalist-specific)
		allowStepJumping: true, // Specific to minimalist stepper
		size: 'medium', // 'small' | 'medium' | 'large' (minimalist-specific)
	},

	steps: [
		{
			id: 'welcome',
			title: 'Welcome',

			layout: {
				__id: 'hero',
				backgroundStyle: 'gradient',
				textAlign: 'center',
			},

			elements: [
				{
					id: 'name',
					__id: 'input',
					inputType: 'text',
					name: 'name',
					label: 'Your Name',
					placeholder: 'Enter your full name',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
			],
		},
		{
			id: 'preferences',
			title: 'Preferences',

			layout: {
				__id: 'hero',
				backgroundStyle: 'solid',
				textAlign: 'center',
			},

			elements: [
				{
					id: 'theme',
					__id: 'radio',
					name: 'theme',
					label: 'Preferred Theme',
					options: [
						{ value: 'light', label: 'Light' },
						{ value: 'dark', label: 'Dark' },
						{ value: 'auto', label: 'Auto' },
					],
					defaultValue: 'auto',
				},
				{
					id: 'notifications',
					__id: 'radio',
					name: 'notifications',
					label: 'Email Notifications',
					options: [
						{ value: 'updates', label: 'Product Updates' },
						{ value: 'newsletter', label: 'Newsletter' },
					],
				},
			],
		},
		{
			id: 'complete',
			title: 'Complete',

			layout: {
				__id: 'hero',
				backgroundStyle: 'success',
				textAlign: 'center',
			},

			elements: [
				{
					id: 'confirmation',
					__id: 'checkbox',
					name: 'confirmation',
					label: 'I agree to the terms and conditions',
					rules: [{ type: 'required', message: 'Please accept the terms' }],
				},
			],
		},
	],
};

/**
 * Traditional stepper configuration example (without registry)
 * Uses direct stepper properties for navigation
 */
export const traditionalStepperForm: FormConfig = {
	mode: 'wizard',
	id: 'traditional-stepper-form',
	title: 'Traditional Stepper Example',
	description: 'Multi-step form using traditional stepper configuration',

	// Direct stepper configuration (not registry-based)
	stepper: {
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
				label: 'Complete',
				variant: 'primary',
			},
		},
	} as any, // Cast to avoid type issues since this is the traditional format

	steps: [
		{
			id: 'step1',
			title: 'Basic Info',
			elements: [
				{
					id: 'name',
					__id: 'input',
					inputType: 'text',
					name: 'name',
					label: 'Full Name',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
			],
		},
		{
			id: 'step2',
			title: 'Contact',
			elements: [
				{
					id: 'email',
					__id: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
			],
		},
	],
};

/**
 * All demo forms for layout and stepper combinations
 */
export const layoutStepperForms = {
	cardWithProgressBar: cardWithProgressBarForm,
	splitScreenWithVertical: splitScreenWithVerticalForm,
	heroWithMinimalist: heroWithMinimalistForm,
	traditionalStepper: traditionalStepperForm,
} as const;

/**
 * Example: How to extend stepper typing for custom steppers
 *
 * If you create a custom stepper component, you can add proper typing like this:
 *
 * ```typescript
 * // In your custom stepper module or global types file:
 * declare module '@json-form-engine/core/steppers/types' {
 *   interface StepperConfigRegistry {
 *     'my-custom-stepper': MyCustomStepperConfig;
 *   }
 * }
 *
 * interface MyCustomStepperConfig extends BaseStepperConfig {
 *   id: 'my-custom-stepper';
 *   customOption?: boolean;
 *   theme?: 'light' | 'dark';
 *   // ... other custom options
 * }
 * ```
 *
 * After this, TypeScript will provide full IntelliSense for your custom stepper!
 */
