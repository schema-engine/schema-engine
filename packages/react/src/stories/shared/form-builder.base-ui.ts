/**
 * Base UI Form Builder for Storybook
 *
 * Provides form creation helpers specifically for base-ui components.
 * Use createForm() to build base-ui-based forms with full TypeScript support.
 * Includes exclusive base-ui elements: slider, checkbox-group, input-otp
 */

import { FormEngineBuilder } from '@json-form-engine/core/builder';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';

import { InputElementRegistration as BaseUIInputElementRegistration } from '@/components/elements/base-ui/inputs/form-input.registration';
import { TextareaElementRegistration as BaseUITextareaElementRegistration } from '@/components/elements/base-ui/inputs/form-textarea.registration';
import { CheckboxElementRegistration as BaseUICheckboxElementRegistration } from '@/components/elements/base-ui/inputs/form-checkbox.registration';
import { RadioElementRegistration as BaseUIRadioElementRegistration } from '@/components/elements/base-ui/inputs/form-radio.registration';
import { SelectElementRegistration as BaseUISelectElementRegistration } from '@/components/elements/base-ui/inputs/form-select.registration';
import { SwitchElementRegistration as BaseUISwitchElementRegistration } from '@/components/elements/base-ui/inputs/form-switch.registration';
import { NumberElementRegistration as BaseUINumberElementRegistration } from '@/components/elements/base-ui/inputs/form-number.registration';
import { SliderElementRegistration } from '@/components/elements/base-ui/inputs/form-slider.registration';
import { CheckboxGroupElementRegistration } from '@/components/elements/base-ui/inputs/form-checkbox-group.registration';
import { InputOTPElementRegistration } from '@/components/elements/base-ui/inputs/form-input-otp.registration';
import { ArrayElementRegistration as BaseUIArrayElementRegistration } from '@/components/elements/base-ui/inputs/form-array-elements.registration';
import { FieldSetRegistration as BaseUIFieldSetRegistration } from '@/components/elements/base-ui/inputs/form-fieldset.registration';
import { SubmitButtonElementRegistration as BaseUISubmitButtonElementRegistration } from '@/components/elements/base-ui/actions/submit-button.registration';

import { CardLayoutRegistration } from '@/components/layouts/card-layout';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout';
import { HeroBackgroundLayoutRegistration } from '@/components/layouts/hero-background-layout';

import { DefaultStepperRegistration } from '@/components/steppers/default-stepper';
import { MinimalistStepperRegistration } from '@/components/steppers/minimalist-stepper';
import { DebuggerStepperRegistration } from '@/components/steppers/debugger-stepper';

import type { InputFieldConfig as BaseUIInputFieldConfig } from '@/components/elements/base-ui/inputs/form-input.types';
import type { TextareaFieldConfig as BaseUITextareaFieldConfig } from '@/components/elements/base-ui/inputs/form-textarea.types';
import type { CheckboxFieldConfig as BaseUICheckboxFieldConfig } from '@/components/elements/base-ui/inputs/form-checkbox.types';
import type { RadioFieldConfig as BaseUIRadioFieldConfig } from '@/components/elements/base-ui/inputs/form-radio.types';
import type { SelectFieldConfig as BaseUISelectFieldConfig } from '@/components/elements/base-ui/inputs/form-select.types';
import type { SwitchFieldConfig as BaseUISwitchFieldConfig } from '@/components/elements/base-ui/inputs/form-switch.types';
import type { NumberFieldConfig as BaseUINumberFieldConfig } from '@/components/elements/base-ui/inputs/form-number.types';
import type { SliderFieldConfig } from '@/components/elements/base-ui/inputs/form-slider.types';
import type { CheckboxGroupFieldConfig } from '@/components/elements/base-ui/inputs/form-checkbox-group.types';
import type { InputOTPFieldConfig } from '@/components/elements/base-ui/inputs/form-input-otp.types';
import type { ArrayElementsConfig as BaseUIArrayElementsConfig } from '@/components/elements/base-ui/inputs/form-array-elements.types';
import type { FieldSetConfig as BaseUIFieldSetConfig } from '@/components/elements/base-ui/inputs/form-fieldset.types';
import type { SubmitButtonConfig as BaseUISubmitButtonConfig } from '@/components/elements/base-ui/actions/submit-button.types';

import type { CardLayoutConfig } from '@/components/layouts/card-layout.types';
import type { SplitScreenLayoutConfig } from '@/components/layouts/split-screen-layout.types';
import type { HeroBackgroundLayoutConfig } from '@/components/layouts/hero-background-layout.types';

import type { DefaultStepperConfig } from '@/components/steppers/default-stepper.types';
import type { MinimalistStepperConfig } from '@/components/steppers/minimalist-stepper.types';
import type { DebuggerStepperConfig } from '@/components/steppers/debugger-stepper.types';

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
 * Create a FormEngineBuilder with all base-ui components registered.
 * Returns a fresh builder instance with proper type inference.
 *
 * Components included:
 * - Elements: input, textarea, checkbox, select, radio, switch, number, slider, checkbox-group, input-otp, arrayElements, fieldSet, submit
 * - Layouts: card, split-screen, hero-background
 * - Steppers: default, minimalist, debugger
 */
function createBaseUIFormEngineBuilder() {
	return new FormEngineBuilder()
		.addElement<'input', BaseUIInputFieldConfig>(BaseUIInputElementRegistration)
		.addElement<'textarea', BaseUITextareaFieldConfig>(BaseUITextareaElementRegistration)
		.addElement<'checkbox', BaseUICheckboxFieldConfig>(BaseUICheckboxElementRegistration)
		.addElement<'radio', BaseUIRadioFieldConfig>(BaseUIRadioElementRegistration)
		.addElement<'select', BaseUISelectFieldConfig>(BaseUISelectElementRegistration)
		.addElement<'switch', BaseUISwitchFieldConfig>(BaseUISwitchElementRegistration)
		.addElement<'number', BaseUINumberFieldConfig>(BaseUINumberElementRegistration)
		.addElement<'slider', SliderFieldConfig>(SliderElementRegistration)
		.addElement<'checkbox-group', CheckboxGroupFieldConfig>(CheckboxGroupElementRegistration)
		.addElement<'input-otp', InputOTPFieldConfig>(InputOTPElementRegistration)
		.addElement<'arrayElements', BaseUIArrayElementsConfig>(BaseUIArrayElementRegistration)
		.addElement<'fieldSet', BaseUIFieldSetConfig>(BaseUIFieldSetRegistration)
		.addElement<'submit', BaseUISubmitButtonConfig>(BaseUISubmitButtonElementRegistration)
		.addLayout<'card', CardLayoutConfig>(CardLayoutRegistration)
		.addLayout<'split-screen', SplitScreenLayoutConfig>(SplitScreenLayoutRegistration)
		.addLayout<'hero-background', HeroBackgroundLayoutConfig>(HeroBackgroundLayoutRegistration)
		.addStepper<'default', DefaultStepperConfig>(DefaultStepperRegistration)
		.addStepper<'minimalist', MinimalistStepperConfig>(MinimalistStepperRegistration)
		.addStepper<'debugger', DebuggerStepperConfig>(DebuggerStepperRegistration);
}

/**
 * Create a form builder with all base-ui components registered.
 * Returns a FormConfigBuilder with full TypeScript IntelliSense for all registered components.
 * Includes exclusive elements: slider, checkbox-group, input-otp
 *
 * @example
 * ```typescript
 * const form = createForm()
 *   .setId('my-form')
 *   .addStep({ id: 'step-1', title: 'Step 1' })
 *   .addElement('slider', { ... })
 *   .addElement('checkbox-group', { ... })
 *   .addElement('input-otp', { ... })
 *   .build();
 * ```
 */
export function createForm() {
	return createBaseUIFormEngineBuilder().createForm();
}

/**
 * Get the base-ui form engine instance
 */
export function getEngine() {
	return createBaseUIFormEngineBuilder().build();
}

/**
 * Create an extendable form engine builder (for adding custom actions, etc.)
 */
export function createExtendableBuilder() {
	return createBaseUIFormEngineBuilder().extend();
}
