/**
 * Base UI Form Builder for Storybook
 *
 * Provides form creation helpers specifically for base-ui components.
 * Use createForm() to build base-ui-based forms with full TypeScript support.
 * Includes exclusive base-ui elements: slider, checkbox-group, input-otp, phone-input
 */

import { FormComposer } from '@schema-engine/forms/builder';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import { SubmitActionRegistration, ResetActionRegistration } from '@schema-engine/forms';

import { InputElementRegistration as BaseUIInputElementRegistration } from '@/components/elements/core-ui/inputs/form-input.registration';
import { TextareaElementRegistration as BaseUITextareaElementRegistration } from '@/components/elements/core-ui/inputs/form-textarea.registration';
import { CheckboxElementRegistration as BaseUICheckboxElementRegistration } from '@/components/elements/core-ui/inputs/form-checkbox.registration';
import { RadioElementRegistration as BaseUIRadioElementRegistration } from '@/components/elements/core-ui/inputs/form-radio.registration';
import { SelectElementRegistration as BaseUISelectElementRegistration } from '@/components/elements/core-ui/inputs/form-select.registration';
import { ComboboxElementRegistration as BaseUIComboboxElementRegistration } from '@/components/elements/core-ui/inputs/form-combobox.registration';
import { SwitchElementRegistration as BaseUISwitchElementRegistration } from '@/components/elements/core-ui/inputs/form-switch.registration';
import { NumberElementRegistration as BaseUINumberElementRegistration } from '@/components/elements/core-ui/inputs/form-number.registration';
import { SliderElementRegistration } from '@/components/elements/core-ui/inputs/form-slider.registration';
import { CheckboxGroupElementRegistration } from '@/components/elements/core-ui/inputs/form-checkbox-group.registration';
import { InputOTPElementRegistration } from '@/components/elements/core-ui/inputs/form-input-otp.registration';
import { PhoneInputElementRegistration } from '@/components/elements/core-ui/inputs/form-phone-input.registration';
import { DropZoneElementRegistration } from '@/components/elements/core-ui/inputs/form-drop-zone.registration';
import { ArrayElementRegistration as BaseUIArrayElementRegistration } from '@/components/elements/core-ui/inputs/form-array-elements.registration';
import { FieldSetRegistration as BaseUIFieldSetRegistration } from '@/components/elements/core-ui/inputs/form-fieldset.registration';
import { SubmitButtonElementRegistration as BaseUISubmitButtonElementRegistration } from '@/components/elements/core-ui/actions/submit-button.registration';
import { SubmissionAlertElementRegistration as BaseUISubmissionAlertElementRegistration } from '@/components/elements/core-ui/content';

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
 * Create a FormComposer with all base-ui components registered.
 * Returns a fresh composer instance with proper type inference.
 *
 * Components included:
 * - Elements: input, textarea, checkbox, select, radio, switch, number, slider, checkbox-group, input-otp, phone-input, drop-zone, arrayElements, fieldSet, submit
 * - Layouts: card, split-screen, hero-background
 * - Steppers: default, minimalist, debugger
 * - Actions: submit, reset
 */
function createBaseUIFormComposer() {
	return new FormComposer()
		.addElement(BaseUIInputElementRegistration)
		.addElement(BaseUITextareaElementRegistration)
		.addElement(BaseUICheckboxElementRegistration)
		.addElement(BaseUIRadioElementRegistration)
		.addElement(BaseUISelectElementRegistration)
		.addElement(BaseUIComboboxElementRegistration)
		.addElement(BaseUISwitchElementRegistration)
		.addElement(BaseUINumberElementRegistration)
		.addElement(SliderElementRegistration)
		.addElement(CheckboxGroupElementRegistration)
		.addElement(InputOTPElementRegistration)
		.addElement(PhoneInputElementRegistration)
		.addElement(DropZoneElementRegistration)
		.addElement(BaseUIArrayElementRegistration)
		.addElement(BaseUIFieldSetRegistration)
		.addElement(BaseUISubmitButtonElementRegistration)
		.addElement(BaseUISubmissionAlertElementRegistration)
		.addLayout(CardLayoutRegistration)
		.addLayout(SplitScreenLayoutRegistration)
		.addLayout(HeroBackgroundLayoutRegistration)
		.addStepper(DefaultStepperRegistration)
		.addStepper(MinimalistStepperRegistration)
		.addStepper(DebuggerStepperRegistration)
		.addAction(SubmitActionRegistration)
		.addAction(ResetActionRegistration);
}

/**
 * Create a form builder with all base-ui components registered.
 * Returns a FormConfigBuilder with full TypeScript IntelliSense for all registered components.
 * Includes exclusive elements: slider, checkbox-group, input-otp, phone-input, drop-zone
 *
 * @example
 * ```typescript
 * const form = createForm()
 *   .setId('my-form')
 *   .addStep({ id: 'step-1', title: 'Step 1' })
 *   .addElement('slider', { ... })
 *   .addElement('checkbox-group', { ... })
 *   .addElement('input-otp', { ... })
 *   .addElement('phone-input', { ... })
 *   .addElement('drop-zone', { ... })
 *   .build();
 * ```
 */
export function createForm() {
	return createBaseUIFormComposer().build().createFormDefinition();
}

/**
 * Get the base-ui form engine instance
 */
export function getEngine() {
	return createBaseUIFormComposer().build();
}

/**
 * Create an extendable form composer (for adding custom actions, etc.)
 */
export function createExtendableComposer() {
	return createBaseUIFormComposer().clone();
}
