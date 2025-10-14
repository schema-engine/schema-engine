/**
 * Form Builder Helpers for Storybook
 *
 * Provides pre-built form templates for testing and demonstration.
 * Use FormTemplates for quick testing or copy patterns for your own forms.
 */

import { ValidationPresets } from '@json-form-engine/core/schemas/validation';
import { createDefaultFormEngineBuilder } from './form-engine-setup';

/**
 * Re-export ValidationPresets for convenience
 */
export { ValidationPresets };

/**
 * Create a form builder with all default components registered.
 * Returns a FormConfigBuilder with full TypeScript IntelliSense for all registered components.
 *
 * @example
 * ```typescript
 * const form = createForm()
 *   .setId('my-form')
 *   .addStep({ id: 'step-1', title: 'Step 1' })
 *   .addElement('input', { name: 'email', inputType: 'email', ... })  // Full autocomplete!
 *   .build();
 * ```
 */
export function createForm() {
	return createDefaultFormEngineBuilder().createForm();
}

/**
 * Pre-built form templates for quick testing.
 * These use runtime validation via Zod schemas registered with each component.
 * Type checking is relaxed here since the builder validates configs at runtime.
 */
export const FormTemplates = {
	contactForm: createForm()
		.setId('contact-form')
		.setTitle('Contact Us')
		.setDescription('Send us a message')
		.setStepper('debugger')
		.addStep({ id: 'contact', title: 'Contact Information', description: 'Your contact details' })
		.addElement('input', {
			id: 'name',
			name: 'name',
			label: 'Full Name',
			placeholder: 'John Doe',
			inputType: 'text',
			rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(2)],
		})
		.addElement('input', {
			id: 'email',
			name: 'email',
			label: 'Email Address',
			placeholder: 'john@example.com',
			inputType: 'email',
			rules: [ValidationPresets.string.email()],
		})
		.addElement('submit', { id: 'submit', label: 'Send Message', name: 'submit' })
		.build(),

	loginForm: createForm()
		.setId('login-form')
		.setTitle('Sign In')
		.addStep({ id: 'login', title: 'Login', description: 'Enter your credentials' })
		.addElement('input', {
			id: 'email',
			name: 'email',
			label: 'Email',
			placeholder: 'your.email@example.com',
			inputType: 'email',
			rules: [ValidationPresets.string.email('Please enter a valid email address')],
		})
		.addElement('input', {
			id: 'password',
			name: 'password',
			label: 'Password',
			inputType: 'password',
			description: 'At least 6 characters with letters, numbers, and symbols',
			rules: [
				ValidationPresets.string.required('Password is required'),
				ValidationPresets.string.pattern('(?=.*[A-Za-z])', 'Must include letters'),
				ValidationPresets.string.pattern('(?=.*\\d)', 'Must include numbers'),
				ValidationPresets.string.pattern('(?=.*[@$!%*#?&])', 'Must include special characters'),
				ValidationPresets.string.minLength(6),
			],
		})
		.addElement('submit', { id: 'submit', label: 'Sign In', name: 'submit' })
		.build(),

	registrationForm: createForm()
		.setId('registration-form')
		.setTitle('Create Account')
		.setDescription('Sign up for a new account')
		.setMode('wizard')
		.setStepper('default', { orientation: 'horizontal', showStepNumbers: true, showStepTitles: true })
		.addStep({ id: 'personal', title: 'Personal Info', description: 'Your personal information' })
		.addElement('input', {
			id: 'firstName',
			name: 'firstName',
			label: 'First Name',
			inputType: 'text',
			rules: [ValidationPresets.string.required('First Name is required')],
		})
		.addElement('input', {
			id: 'lastName',
			name: 'lastName',
			label: 'Last Name',
			inputType: 'text',
			rules: [ValidationPresets.string.required('Last Name is required')],
		})
		.addStep({ id: 'account', title: 'Account Details', description: 'Your account details' })
		.addElement('input', {
			id: 'email',
			name: 'email',
			label: 'Email',
			inputType: 'email',
			rules: [ValidationPresets.string.email('Please enter a valid email address')],
		})
		.addElement('input', {
			id: 'password',
			name: 'password',
			label: 'Password',
			inputType: 'password',
			rules: [ValidationPresets.string.required('Password is required'), ValidationPresets.string.minLength(8)],
		})
		.build(),

	onboardingSurvey: createForm()
		.setId('onboarding-survey')
		.setTitle('Welcome Onboarding')
		.setDescription('Help us get to know you better')
		.setMode('wizard')
		.setStepper('default', { orientation: 'horizontal', showStepNumbers: true, showStepTitles: true })
		.addStep({ id: 'profile', title: 'Your Profile', description: 'Basic information' })
		.addElement('input', {
			id: 'fullName',
			name: 'fullName',
			label: 'Full Name',
			inputType: 'text',
			placeholder: 'John Doe',
			rules: [ValidationPresets.string.required('Name is required')],
		})
		.addElement('input', {
			id: 'email',
			name: 'email',
			label: 'Email Address',
			inputType: 'email',
			placeholder: 'john@example.com',
			rules: [ValidationPresets.string.email()],
		})
		.addStep({ id: 'preferences', title: 'Preferences', description: 'Your interests and goals' })
		.addElement('select', {
			id: 'role',
			name: 'role',
			label: 'What best describes you?',
			placeholder: 'Select your role',
			options: [
				{ value: 'developer', label: 'Developer' },
				{ value: 'designer', label: 'Designer' },
				{ value: 'manager', label: 'Product Manager' },
				{ value: 'other', label: 'Other' },
			],
			rules: [ValidationPresets.string.required('Please select a role')],
		})
		.addElement('textarea', {
			id: 'interests',
			name: 'interests',
			label: 'Areas of interest',
			placeholder: 'Tell us what interests you',
			rows: 3,
		})
		.addStep({ id: 'experience', title: 'Experience', description: 'Tell us about your background' })
		.addElement('select', {
			id: 'experienceLevel',
			name: 'experienceLevel',
			label: 'Years of experience',
			placeholder: 'Select experience level',
			options: [
				{ value: '0-1', label: 'Less than 1 year' },
				{ value: '1-3', label: '1-3 years' },
				{ value: '3-5', label: '3-5 years' },
				{ value: '5+', label: 'More than 5 years' },
			],
			rules: [ValidationPresets.string.required('Please select your experience level')],
		})
		.addElement('textarea', {
			id: 'goals',
			name: 'goals',
			label: 'What are your goals?',
			placeholder: 'Tell us what you want to achieve',
			rows: 4,
		})
		.addStep({ id: 'confirm', title: 'Confirmation', description: 'Review and submit' })
		.addElement('switch', {
			id: 'newsletter',
			name: 'newsletter',
			label: 'Subscribe to newsletter',
			description: 'Get updates about new features and content',
		})
		.addElement('switch', {
			id: 'terms',
			name: 'terms',
			label: 'I agree to the terms and conditions',
			rules: [ValidationPresets.string.required('You must accept the terms')],
		})
		.build(),

	cardForm: createForm()
		.setId('card-form')
		.setTitle('Card Example')
		.addStep({ id: 'step-1', title: 'Step 1', description: 'Description for step 1' })
		.setStepLayout('card', { maxWidth: 'md', padding: 'lg', shadowSize: 'lg' })
		.addElement('input', {
			id: 'name',
			name: 'name',
			label: 'Name',
			inputType: 'text',
			rules: [ValidationPresets.string.required('Name is required')],
		})
		.addElement('input', {
			id: 'email',
			name: 'email',
			label: 'Email',
			inputType: 'email',
			rules: [ValidationPresets.string.email('Please enter a valid email address')],
		})
		.addElement('submit', { id: 'submit', label: 'Send Message', name: 'submit' })
		.build(),

	splitScreenForm: createForm()
		.setId('split-screen-demo')
		.setTitle('Account Setup')
		.setDescription('Create your account to get started')
		.addStep({
			id: 'account-step',
			title: 'Account Setup',
			description: 'Create your account to get started',
		})
		.setStepLayout('split-screen', {})
		.addElement('input', {
			id: 'username',
			name: 'username',
			label: 'Username',
			placeholder: 'johndoe',
			inputType: 'text',
		})
		.addElement('input', {
			id: 'email',
			name: 'email',
			label: 'Email',
			placeholder: 'john@example.com',
			inputType: 'email',
			rules: [ValidationPresets.string.email()],
		})
		.addElement('submit', {
			id: 'submit',
			name: 'submit',
			label: 'Create Account',
		})
		.build(),
};
