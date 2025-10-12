/**
 * Form Engine Setup for Storybook Stories
 *
 * This file provides a pre-configured FormEngine instance with all default
 * components registered. Use this in Storybook stories to render forms.
 *
 * @example
 * ```tsx
 * import { FormEngineProvider } from '@json-form-engine/react';
 * import { defaultFormEngine } from './shared/form-engine-setup';
 * import { rhfAdapter } from '@json-form-engine/react/adapters';
 *
 * export const MyStory = () => (
 *   <FormEngineProvider engine={defaultFormEngine} adapter={rhfAdapter}>
 *     <FormRenderer config={myFormConfig} />
 *   </FormEngineProvider>
 * );
 * ```
 */

import { FormEngineBuilder } from '@json-form-engine/core/builder';
import { InputElementRegistration } from '@/components/elements/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/elements/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/elements/inputs/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/elements/inputs/form-select.registration';
import { RadioElementRegistration } from '@/components/elements/inputs/form-radio.registration';
import { SwitchElementRegistration } from '@/components/elements/inputs/form-switch.registration';
import { NumberElementRegistration } from '@/components/elements/inputs/form-number.registration';
import { ArrayElementRegistration } from '@/components/elements/inputs/form-array-elements.registration';
import { SubmitButtonElementRegistration } from '@/components/elements/actions/submit-button.registration';
import { CardLayoutRegistration } from '@/components/layouts/card-layout';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout';
import { HeroBackgroundLayoutRegistration } from '@/components/layouts/hero-background-layout';
import { DefaultStepperRegistration } from '@/components/steppers/default-stepper';
import { VerticalStepperRegistration } from '@/components/steppers/vertical-stepper';
import { MinimalistStepperRegistration } from '@/components/steppers/minimalist-stepper';
import { DebuggerStepperRegistration } from '@/components/steppers/debugger-stepper';

import type { InputFieldConfig } from '@/components/elements/inputs/form-input.types';
import type { TextareaFieldConfig } from '@/components/elements/inputs/form-textarea.types';
import type { CheckboxFieldConfig } from '@/components/elements/inputs/form-checkbox.types';
import type { SelectFieldConfig } from '@/components/elements/inputs/form-select.types';
import type { RadioFieldConfig } from '@/components/elements/inputs/form-radio.types';
import type { SwitchFieldConfig } from '@/components/elements/inputs/form-switch.types';
import type { NumberFieldConfig } from '@/components/elements/inputs/form-number.types';
import type { ArrayElementsConfig } from '@/components/elements/inputs/form-array-elements.types';
import type { SubmitButtonConfig } from '@/components/elements/actions/submit-button.types';
import type { CardLayoutConfig } from '@/components/layouts/card-layout.types';
import type { SplitScreenLayoutConfig } from '@/components/layouts/split-screen-layout.types';
import type { HeroBackgroundLayoutConfig } from '@/components/layouts/hero-background-layout.types';
import type { DefaultStepperConfig } from '@/components/steppers/default-stepper.types';
import type { VerticalStepsStepperConfig } from '@/components/steppers/vertical-stepper.types';
import type { MinimalistStepperConfig } from '@/components/steppers/minimalist-stepper.types';
import type { DebuggerStepperConfig } from '@/components/steppers/debugger-stepper.types';

import '@/components/steppers/default-stepper.css';
import '@/components/steppers/vertical-stepper.css';
import '@/components/steppers/minimalist-stepper.css';
import '@/components/steppers/debugger-stepper.css';

import '@/components/layouts/card-layout.css';
import '@/components/layouts/split-screen-layout.css';
import '@/components/layouts/hero-background-layout.css';

/**
 * Create a FormEngineBuilder with all default components registered.
 * Returns a fresh builder instance with proper type inference.
 *
 * Components included:
 * - Elements: input, textarea, checkbox, select, radio, switch, number, arrayElements, submit
 * - Layouts: card, split-screen, hero-background
 * - Steppers: default, vertical, minimalist, debugger
 *
 * @example
 * ```typescript
 * // Create a typed form
 * const form = createDefaultFormEngineBuilder()
 *   .createForm()
 *   .setId('my-form')
 *   .addStep({ id: 'step-1', title: 'Step 1' })
 *   .addElement('input', { ... })
 *   .build();
 *
 * // Or build an engine
 * const engine = createDefaultFormEngineBuilder().build();
 * ```
 */
export function createDefaultFormEngineBuilder() {
	return new FormEngineBuilder()
		.addElement<'input', InputFieldConfig>(InputElementRegistration)
		.addElement<'textarea', TextareaFieldConfig>(TextareaElementRegistration)
		.addElement<'checkbox', CheckboxFieldConfig>(CheckboxElementRegistration)
		.addElement<'select', SelectFieldConfig>(SelectElementRegistration)
		.addElement<'radio', RadioFieldConfig>(RadioElementRegistration)
		.addElement<'switch', SwitchFieldConfig>(SwitchElementRegistration)
		.addElement<'number', NumberFieldConfig>(NumberElementRegistration)
		.addElement<'arrayElements', ArrayElementsConfig>(ArrayElementRegistration)
		.addElement<'submit', SubmitButtonConfig>(SubmitButtonElementRegistration)
		.addLayout<'card', CardLayoutConfig>(CardLayoutRegistration)
		.addLayout<'split-screen', SplitScreenLayoutConfig>(SplitScreenLayoutRegistration)
		.addLayout<'hero-background', HeroBackgroundLayoutConfig>(HeroBackgroundLayoutRegistration)
		.addStepper<'default', DefaultStepperConfig>(DefaultStepperRegistration)
		.addStepper<'vertical', VerticalStepsStepperConfig>(VerticalStepperRegistration)
		.addStepper<'minimalist', MinimalistStepperConfig>(MinimalistStepperRegistration)
		.addStepper<'debugger', DebuggerStepperConfig>(DebuggerStepperRegistration);
}

/**
 * Default FormEngine instance for Storybook stories.
 * Use this in FormEngineProvider for rendering forms.
 */
export const defaultFormEngine = createDefaultFormEngineBuilder().build();

/**
 * Helper to create a custom FormEngine instance
 *
 * @example
 * ```tsx
 * import { createCustomEngine } from './shared/form-engine-setup';
 * import { MyCustomElement } from './my-custom-element';
 *
 * const myEngine = createCustomEngine()
 *   .addElement(MyCustomElement)
 *   .build();
 * ```
 */
export function createCustomEngine() {
	return new FormEngineBuilder();
}

/**
 * Re-export commonly used registrations for convenience
 */
export {
	InputElementRegistration,
	TextareaElementRegistration,
	CheckboxElementRegistration,
	SelectElementRegistration,
	RadioElementRegistration,
	SwitchElementRegistration,
	NumberElementRegistration,
	ArrayElementRegistration,
	CardLayoutRegistration,
	SplitScreenLayoutRegistration,
	HeroBackgroundLayoutRegistration,
	DefaultStepperRegistration,
	VerticalStepperRegistration,
	MinimalistStepperRegistration,
	DebuggerStepperRegistration,
};
