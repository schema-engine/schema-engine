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

import {
	createReactFormEngine,
	toElementRegistration,
	toLayoutRegistration,
	toStepperRegistration,
} from '@/registries/builder-registry';
import { InputElement } from '@/components/form/fields/form-input';
import { TextareaElement } from '@/components/form/fields/form-textarea';
import { CheckboxElement } from '@/components/form/fields/form-checkbox';
import { SelectElement } from '@/components/form/fields/form-select';
import { RadioElement } from '@/components/form/fields/form-radio';
import { SwitchElement } from '@/components/form/fields/form-switch';
import { NumberElement } from '@/components/form/fields/form-number';
import { ArrayElement } from '@/components/form/fields/form-array-elements';
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
	.addElement(toElementRegistration(InputElement))
	.addElement(toElementRegistration(TextareaElement))
	.addElement(toElementRegistration(CheckboxElement))
	.addElement(toElementRegistration(SelectElement))
	.addElement(toElementRegistration(RadioElement))
	.addElement(toElementRegistration(SwitchElement))
	.addElement(toElementRegistration(NumberElement))
	.addElement(toElementRegistration(ArrayElement))
	.addLayout(toLayoutRegistration(CardLayoutRegistration))
	.addLayout(toLayoutRegistration(SplitScreenLayoutRegistration))
	.addLayout(toLayoutRegistration(HeroBackgroundLayoutRegistration))
	.addStepper(toStepperRegistration(DefaultStepperRegistration))
	.addStepper(toStepperRegistration(VerticalStepperRegistration))
	.addStepper(toStepperRegistration(MinimalistStepperRegistration))
	.addStepper(toStepperRegistration(DebuggerStepperRegistration))
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
 *   .addElement(toElementRegistration(MyCustomElement))
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
	InputElement,
	TextareaElement,
	CheckboxElement,
	SelectElement,
	RadioElement,
	SwitchElement,
	NumberElement,
	ArrayElement,
	CardLayoutRegistration,
	SplitScreenLayoutRegistration,
	HeroBackgroundLayoutRegistration,
	DefaultStepperRegistration,
	VerticalStepperRegistration,
	MinimalistStepperRegistration,
	DebuggerStepperRegistration,
};
