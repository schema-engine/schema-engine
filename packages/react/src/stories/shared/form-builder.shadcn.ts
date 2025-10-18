/**
 * Shadcn Form Builder for Storybook
 *
 * Provides form creation helpers specifically for shadcn components.
 * Use createForm() to build shadcn-based forms with full TypeScript support.
 */

import { FormEngineBuilder } from '@json-form-engine/core/builder';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';

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

import { CardLayoutRegistration } from '@/components/layouts/card-layout';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout';
import { HeroBackgroundLayoutRegistration } from '@/components/layouts/hero-background-layout';

import { DefaultStepperRegistration } from '@/components/steppers/default-stepper';
import { MinimalistStepperRegistration } from '@/components/steppers/minimalist-stepper';
import { DebuggerStepperRegistration } from '@/components/steppers/debugger-stepper';

import type { InputFieldConfig } from '@/components/elements/shadcn/inputs/form-input.types';
import type { TextareaFieldConfig } from '@/components/elements/shadcn/inputs/form-textarea.types';
import type { CheckboxFieldConfig } from '@/components/elements/shadcn/inputs/form-checkbox.types';
import type { SelectFieldConfig } from '@/components/elements/shadcn/inputs/form-select.types';
import type { RadioFieldConfig } from '@/components/elements/shadcn/inputs/form-radio.types';
import type { SwitchFieldConfig } from '@/components/elements/shadcn/inputs/form-switch.types';
import type { NumberFieldConfig } from '@/components/elements/shadcn/inputs/form-number.types';
import type { ArrayElementsConfig } from '@/components/elements/shadcn/inputs/form-array-elements.types';
import type { FieldSetConfig } from '@/components/elements/shadcn/inputs/form-fieldset.types';

import type { SubmitButtonConfig } from '@/components/elements/shadcn/actions/submit-button.types';

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
 * Create a FormEngineBuilder with all default (shadcn) components registered.
 * Returns a fresh builder instance with proper type inference.
 *
 * Components included:
 * - Elements: input, textarea, checkbox, select, radio, switch, number, arrayElements, fieldSet, submit
 * - Layouts: card, split-screen, hero-background
 * - Steppers: default, minimalist, debugger
 */
function createDefaultFormEngineBuilder() {
	return new FormEngineBuilder()
		.addElement<'input', InputFieldConfig>(InputElementRegistration)
		.addElement<'textarea', TextareaFieldConfig>(TextareaElementRegistration)
		.addElement<'checkbox', CheckboxFieldConfig>(CheckboxElementRegistration)
		.addElement<'select', SelectFieldConfig>(SelectElementRegistration)
		.addElement<'radio', RadioFieldConfig>(RadioElementRegistration)
		.addElement<'switch', SwitchFieldConfig>(SwitchElementRegistration)
		.addElement<'number', NumberFieldConfig>(NumberElementRegistration)
		.addElement<'arrayElements', ArrayElementsConfig>(ArrayElementRegistration)
		.addElement<'fieldSet', FieldSetConfig>(FieldSetRegistration)
		.addElement<'submit', SubmitButtonConfig>(SubmitButtonElementRegistration)
		.addLayout<'card', CardLayoutConfig>(CardLayoutRegistration)
		.addLayout<'split-screen', SplitScreenLayoutConfig>(SplitScreenLayoutRegistration)
		.addLayout<'hero-background', HeroBackgroundLayoutConfig>(HeroBackgroundLayoutRegistration)
		.addStepper<'default', DefaultStepperConfig>(DefaultStepperRegistration)
		.addStepper<'minimalist', MinimalistStepperConfig>(MinimalistStepperRegistration)
		.addStepper<'debugger', DebuggerStepperConfig>(DebuggerStepperRegistration);
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
	return createDefaultFormEngineBuilder().createForm();
}

/**
 * Get the shadcn form engine instance
 */
export function getEngine() {
	return createDefaultFormEngineBuilder().build();
}

/**
 * Create an extendable form engine builder (for adding custom actions, etc.)
 */
export function createExtendableBuilder() {
	return createDefaultFormEngineBuilder().extend();
}
