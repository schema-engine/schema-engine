/**
 * Shadcn Form Builder for Storybook
 *
 * Provides form creation helpers specifically for shadcn components.
 * Use createForm() to build shadcn-based forms with full TypeScript support.
 */

import { FormComposer } from '@schema-engine/forms/builder';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import { formResetPlugin, formSubmitPlugin } from '@schema-engine/forms';

import { InputElementRegistration } from '@/components/elements/shadcn/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/elements/shadcn/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/elements/shadcn/inputs/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/elements/shadcn/inputs/form-select.registration';
import { RadioElementRegistration } from '@/components/elements/shadcn/inputs/form-radio.registration';
import { SwitchElementRegistration } from '@/components/elements/shadcn/inputs/form-switch.registration';
import { NumberElementRegistration } from '@/components/elements/shadcn/inputs/form-number.registration';
import { ArrayElementRegistration } from '@/components/elements/shadcn/inputs/form-array-elements.registration';
import { FieldSetRegistration } from '@/components/elements/shadcn/inputs/form-fieldset.registration';
import { SubmitButtonElementRegistration } from '@/components/elements/shadcn/actions/submit-button.registration';

import { CardLayoutRegistration } from '@/components/layouts/card-layout.registration';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout.registration';
import { HeroBackgroundLayoutRegistration } from '@/components/layouts/hero-background-layout.registration';

import { DefaultStepperRegistration } from '@/components/steppers/default-stepper.registration';
import { MinimalistStepperRegistration } from '@/components/steppers/minimalist-stepper.registration';
import { DebuggerStepperRegistration } from '@/components/steppers/debugger-stepper.registration';

import '@/components/steppers/default-stepper.css';
import '@/components/steppers/minimalist-stepper.css';
import '@/components/steppers/debugger-stepper.css';

import '@/components/layouts/card-layout.css';
import '@/components/layouts/split-screen-layout.css';
import '@/components/layouts/hero-background-layout.css';
/**
 * Re-export ValidationPresets for convenience
 */
export { ValidationPresets };

/**
 * Create a FormComposer with all default (shadcn) components registered.
 * Returns a fresh composer instance with proper type inference.
 *
 * Components included:
 * - Elements: input, textarea, checkbox, select, radio, switch, number, arrayElements, fieldSet, submit
 * - Layouts: card, split-screen, hero-background
 * - Steppers: default, minimalist, debugger
 */
function createDefaultFormComposer() {
	return new FormComposer()
		.addElement(InputElementRegistration)
		.addElement(TextareaElementRegistration)
		.addElement(CheckboxElementRegistration)
		.addElement(SelectElementRegistration)
		.addElement(RadioElementRegistration)
		.addElement(SwitchElementRegistration)
		.addElement(NumberElementRegistration)
		.addElement(ArrayElementRegistration)
		.addElement(FieldSetRegistration)
		.addElement(SubmitButtonElementRegistration)
		.addLayout(CardLayoutRegistration)
		.addLayout(SplitScreenLayoutRegistration)
		.addLayout(HeroBackgroundLayoutRegistration)
		.addStepper(DefaultStepperRegistration)
		.addStepper(MinimalistStepperRegistration)
		.addStepper(DebuggerStepperRegistration)
		.addAction(
			formSubmitPlugin({
				onError(error, context) {
					console.error('Form submission error:', error, context);
				},
				onSuccess(response, context) {
					console.log('Form submitted successfully:', response, context);
				},
			}),
		)
		.addAction(
			formResetPlugin({
				onReset(context) {
					console.log('Form has been reset:', context);
				},
			}),
		);
}

/**
 * Create a form builder with all shadcn components registered.
 * Returns a FormConfigBuilder with full TypeScript IntelliSense for all registered components.
 *
 * @example
 * ```typescript
 * const form = createForm()
 *   .setId('my-form')
 *   .addStep({ id: 'step-1', title: 'Step 1' })
 *   .addElement('input', { name: 'email', inputType: 'email', ... })
 *   .build();
 * ```
 */
export function createForm() {
	return createDefaultFormComposer().build().createFormDefinition();
}

/**
 * Get the shadcn form engine instance
 */
export function getEngine() {
	return createDefaultFormComposer().build();
}

/**
 * Create an extendable form composer (for adding custom actions, etc.)
 */
export function createExtendableComposer() {
	return createDefaultFormComposer().clone();
}
