/**
 * Form Builder Helpers for Storybook
 *
 * Utilities to quickly create form configurations for testing and stories.
 */

import type { FormConfig, FormStep } from '@json-form-engine/core/schemas';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';

type ElementId = keyof FormEngine.ElementRegistry;
type LayoutId = keyof FormEngine.LayoutRegistry;
type StepperId = keyof FormEngine.StepperRegistry;
type InputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';

/**
 * Quick form builder for creating test forms
 *
 * @example
 * ```tsx
 * const form = createForm({
 *   id: 'test-form',
 *   title: 'Test Form',
 * })
 *   .addStep({
 *     id: 'step-1',
 *     title: 'Personal Info',
 *   })
 *   .addInputField({
 *     name: 'name',
 *     label: 'Name',
 *     required: true,
 *   })
 *   .addEmailField({
 *     name: 'email',
 *     label: 'Email',
 *   })
 *   .build();
 * ```
 */
export class FormBuilder {
	private config: FormConfig;
	private currentStep: FormStep | null = null;

	constructor(config: Partial<FormConfig>) {
		this.config = {
			id: config.id || 'form',
			title: config.title,
			description: config.description,
			mode: config.mode || 'free',
			steps: [],
		};
	}

	/**
	 * Add a new step to the form
	 */
	addStep(step: Partial<FormStep> & { id: string }): this {
		this.currentStep = {
			id: step.id,
			title: step.title || step.id,
			description: step.description,
			elements: [],
			layout: step.layout,
		} as FormStep;
		this.config.steps.push(this.currentStep);
		return this;
	}

	/**
	 * Add a text input field
	 */
	addInputField(options: {
		name: string;
		label: string;
		placeholder?: string;
		required?: boolean;
		inputType?: InputType;
		minLength?: number;
	}): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding fields');
		}

		const rules = [];
		if (options.required) {
			rules.push(ValidationPresets.string.required(`${options.label} is required`));
		}
		if (options.minLength) {
			rules.push(
				ValidationPresets.string.minLength(
					options.minLength,
					`${options.label} must be at least ${options.minLength} characters`,
				),
			);
		}
		if (options.inputType === 'email') {
			rules.push(ValidationPresets.string.email('Please enter a valid email address'));
		}

		this.currentStep.elements.push({
			__id: 'input',
			inputType: options.inputType || 'text',
			id: options.name,
			name: options.name,
			label: options.label,
			placeholder: options.placeholder,
			rules: rules.length > 0 ? rules : undefined,
		});

		return this;
	}

	/**
	 * Add an email field (shorthand for input with type=email)
	 */
	addEmailField(options: { name: string; label: string; placeholder?: string; required?: boolean }): this {
		return this.addInputField({
			...options,
			inputType: 'email',
		});
	}

	/**
	 * Add a password field (shorthand for input with type=password)
	 */
	addPasswordField(options: {
		name: string;
		label: string;
		placeholder?: string;
		required?: boolean;
		minLength?: number;
	}): this {
		return this.addInputField({
			...options,
			inputType: 'password',
		});
	}

	/**
	 * Add any field type with full type safety
	 */
	addField<T extends ElementId>(field: FormEngine.ElementRegistry[T]): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before adding fields');
		}
		this.currentStep.elements.push(field as any);
		return this;
	}

	/**
	 * Set the layout for the current step with full type safety
	 */
	withLayout<T extends LayoutId>(id: T, config?: Omit<FormEngine.LayoutRegistry[T], '__id'>): this {
		if (!this.currentStep) {
			throw new Error('Must call addStep() before setting layout');
		}
		this.currentStep.layout = {
			id,
			...config,
		} as any;
		return this;
	}

	/**
	 * Set the stepper configuration with full type safety
	 */
	withStepper<T extends StepperId>(id: T, config?: Omit<FormEngine.StepperRegistry[T], '__id'>): this {
		this.config.stepper = {
			id,
			...config,
		} as any;
		return this;
	}

	/**
	 * Set the form mode
	 */
	withMode(mode: 'free' | 'wizard'): this {
		this.config.mode = mode;
		return this;
	}

	/**
	 * Build and return the form configuration
	 */
	build(): FormConfig {
		if (this.config.steps.length === 0) {
			throw new Error('Form must have at least one step');
		}
		return this.config;
	}
}

/**
 * Create a new form builder
 *
 * @example
 * ```tsx
 * const form = createForm({ id: 'my-form', title: 'My Form' })
 *   .addStep({ id: 'step-1' })
 *   .addInputField({ name: 'name', label: 'Name' })
 *   .build();
 * ```
 */
export function createForm(config: { id: string; title?: string; description?: string }): FormBuilder {
	return new FormBuilder(config);
}

/**
 * Pre-built form templates for quick testing
 */
export const FormTemplates = {
	/**
	 * Simple contact form with name, email, and message
	 */
	contactForm: () =>
		createForm({
			id: 'contact-form',
			title: 'Contact Us',
			description: 'Send us a message',
		})
			.withStepper('debugger')
			.addStep({ id: 'contact' })
			.addInputField({
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				required: true,
				minLength: 2,
			})
			.addEmailField({
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				required: true,
			})
			.build(),

	/**
	 * Login form with email and password
	 */
	loginForm: () =>
		createForm({
			id: 'login-form',
			title: 'Sign In',
		})
			.addStep({ id: 'login' })
			.addEmailField({
				name: 'email',
				label: 'Email',
				placeholder: 'your.email@example.com',
				required: true,
			})
			.addPasswordField({
				name: 'password',
				label: 'Password',
				required: true,
				minLength: 8,
			})
			.build(),

	/**
	 * Multi-step registration with stepper
	 */
	registrationForm: () =>
		createForm({
			id: 'registration-form',
			title: 'Create Account',
			description: 'Sign up for a new account',
		})
			.withMode('wizard')
			.withStepper('default', { showStepNumbers: true, showStepTitles: true })
			.addStep({ id: 'personal', title: 'Personal Info' })
			.addInputField({
				name: 'firstName',
				label: 'First Name',
				required: true,
			})
			.addInputField({
				name: 'lastName',
				label: 'Last Name',
				required: true,
			})
			.addStep({ id: 'account', title: 'Account Details' })
			.addEmailField({
				name: 'email',
				label: 'Email',
				required: true,
			})
			.addPasswordField({
				name: 'password',
				label: 'Password',
				required: true,
				minLength: 8,
			})
			.build(),

	/**
	 * Form with card layout
	 */
	cardForm: () =>
		createForm({
			id: 'card-form',
			title: 'Card Example',
		})
			.addStep({ id: 'step-1' })
			.withLayout('card', { maxWidth: 'md', padding: 'lg', shadowSize: 'lg' })
			.addInputField({
				name: 'name',
				label: 'Name',
				required: true,
			})
			.addEmailField({
				name: 'email',
				label: 'Email',
				required: true,
			})
			.build(),
};
