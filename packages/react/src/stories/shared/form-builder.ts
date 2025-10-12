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
	/**
	 * Simple contact form with name, email, and message
	 */
	contactForm: () =>
		createForm()
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

	/**
	 * Login form with email and password
	 */
	loginForm: () =>
		createForm()
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
				rules: [
					ValidationPresets.string.required('Password is required'),
					ValidationPresets.string.minLength(8),
				],
			})
			.addElement('submit', { id: 'submit', label: 'Send Message', name: 'submit' })
			.build(),

	/**
	 * Multi-step registration with stepper
	 */
	registrationForm: () =>
		createForm()
			.setId('registration-form')
			.setTitle('Create Account')
			.setDescription('Sign up for a new account')
			.setMode('wizard')
			.setStepper('default', { showStepNumbers: true, showStepTitles: true })
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
				rules: [
					ValidationPresets.string.required('Password is required'),
					ValidationPresets.string.minLength(8),
				],
			})
			.build(),

	/**
	 * Form with card layout
	 */
	cardForm: () =>
		createForm()
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
};
