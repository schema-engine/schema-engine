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

import { createReactFormEngine } from '@/registries/builder-registry';
import { InputElementRegistration } from '@/components/form/fields/form-input.registration';
import { TextareaElementRegistration } from '@/components/form/fields/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/form/fields/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/form/fields/form-select.registration';
import { RadioElementRegistration } from '@/components/form/fields/form-radio.registration';
import { SwitchElementRegistration } from '@/components/form/fields/form-switch.registration';
import { NumberElementRegistration } from '@/components/form/fields/form-number.registration';
import { ArrayElementRegistration } from '@/components/form/fields/form-array-elements.registration';
import { CardLayoutRegistration } from '@/components/layouts/card-layout';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout';
import { HeroBackgroundLayoutRegistration } from '@/components/layouts/hero-background-layout';
import { DefaultStepperRegistration } from '@/components/steppers/default-stepper';
import { VerticalStepperRegistration } from '@/components/steppers/vertical-stepper';
import { MinimalistStepperRegistration } from '@/components/steppers/minimalist-stepper';
import { DebuggerStepperRegistration } from '@/components/steppers/debugger-stepper';

import '@/components/steppers/default-stepper.css';
import '@/components/steppers/vertical-stepper.css';
import '@/components/steppers/minimalist-stepper.css';
import '@/components/steppers/debugger-stepper.css';

import '@/components/layouts/card-layout.css';
import '@/components/layouts/split-screen-layout.css';
import '@/components/layouts/hero-background-layout.css';

/**
 * Default FormEngine instance with all built-in components registered.
 *
 * Components included:
 * - Elements: input, textarea, checkbox, select, radio, switch, number, arrayElements
 * - Layouts: card, split-screen, hero-background
 * - Steppers: default, vertical, minimalist, debugger
 */
export const defaultFormEngine = createReactFormEngine()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addElement(CheckboxElementRegistration)
	.addElement(SelectElementRegistration)
	.addElement(RadioElementRegistration)
	.addElement(SwitchElementRegistration)
	.addElement(NumberElementRegistration)
	.addElement(ArrayElementRegistration)
	.addLayout(CardLayoutRegistration)
	.addLayout(SplitScreenLayoutRegistration)
	.addLayout(HeroBackgroundLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.addStepper(VerticalStepperRegistration)
	.addStepper(MinimalistStepperRegistration)
	.addStepper(DebuggerStepperRegistration)
	.build();

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
	return createReactFormEngine();
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
