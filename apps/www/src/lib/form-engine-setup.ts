/**
 * Centralized form engine setup
 * Uses the new Builder Pattern to configure and build the form engine instance
 */

import { createReactFormEngine } from '@json-form-engine/react/registries/builder-registry';
import {
	InputElement,
	TextareaElement,
	CheckboxElement,
	RadioElement,
	SelectElement,
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
} from '@json-form-engine/react/registrations';

/**
 * Global form engine instance for the www app
 * All components and demos use this single instance
 */
export const formEngine = createReactFormEngine()
	.addElement(InputElement)
	.addElement(TextareaElement)
	.addElement(CheckboxElement)
	.addElement(RadioElement)
	.addElement(SelectElement)
	.addElement(SwitchElement)
	.addElement(NumberElement)
	.addElement(ArrayElement)
	.addLayout(CardLayoutRegistration)
	.addLayout(SplitScreenLayoutRegistration)
	.addLayout(HeroBackgroundLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.addStepper(VerticalStepperRegistration)
	.addStepper(MinimalistStepperRegistration)
	.addStepper(DebuggerStepperRegistration)
	.build();
