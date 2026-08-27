/**
 * Base UI Form Builder for Storybook
 *
 * Registers every Schema Engine form element from the Base UI registry source.
 * Elements are added individually so FormComposer keeps a typed element map.
 */

import { FormComposer } from '@schema-engine/forms/builder';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import { SubmitActionRegistration, ResetActionRegistration } from '@schema-engine/forms';
import {
	ArrayElementRegistration,
	CheckboxElementRegistration,
	CheckboxGroupElementRegistration,
	ComboboxElementRegistration,
	DropZoneElementRegistration,
	FieldSetRegistration,
	InputElementRegistration,
	InputOTPElementRegistration,
	NumberElementRegistration,
	PhoneInputElementRegistration,
	MaskedInputElementRegistration,
	RadioElementRegistration,
	SelectElementRegistration,
	SliderElementRegistration,
	SubmissionAlertElementRegistration,
	SubmitButtonElementRegistration,
	SwitchElementRegistration,
	TextareaElementRegistration,
} from '@/components/schema-engine/forms/registrations';

import { CardLayoutRegistration } from '@/components/layouts/card-layout.registration';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout.registration';
import { HeroBackgroundLayoutRegistration } from '@/components/layouts/hero-background-layout.registration';

import { DefaultStepperRegistration } from '@/components/schema-engine/forms/steppers/default-stepper.registration';
import { MinimalistStepperRegistration } from '@/components/schema-engine/forms/steppers/minimalist-stepper.registration';

import '@/components/layouts/card-layout.css';
import '@/components/layouts/split-screen-layout.css';
import '@/components/layouts/hero-background-layout.css';

export { ValidationPresets };

function createBaseUIFormComposer() {
	return new FormComposer()
		.addElement(InputElementRegistration)
		.addElement(TextareaElementRegistration)
		.addElement(CheckboxElementRegistration)
		.addElement(RadioElementRegistration)
		.addElement(SelectElementRegistration)
		.addElement(ComboboxElementRegistration)
		.addElement(SwitchElementRegistration)
		.addElement(NumberElementRegistration)
		.addElement(SliderElementRegistration)
		.addElement(CheckboxGroupElementRegistration)
		.addElement(InputOTPElementRegistration)
		.addElement(PhoneInputElementRegistration)
		.addElement(MaskedInputElementRegistration)
		.addElement(DropZoneElementRegistration)
		.addElement(ArrayElementRegistration)
		.addElement(FieldSetRegistration)
		.addElement(SubmitButtonElementRegistration)
		.addElement(SubmissionAlertElementRegistration)
		.addLayout(CardLayoutRegistration)
		.addLayout(SplitScreenLayoutRegistration)
		.addLayout(HeroBackgroundLayoutRegistration)
		.addStepper(DefaultStepperRegistration)
		.addStepper(MinimalistStepperRegistration)
		.addAction(SubmitActionRegistration)
		.addAction(ResetActionRegistration);
}

export function createForm() {
	return createBaseUIFormComposer().build().createFormDefinition();
}

export function getEngine() {
	return createBaseUIFormComposer().build();
}

export function createExtendableComposer() {
	return createBaseUIFormComposer().clone();
}

export { rhfAdapter } from '@/adapters/react-hook-form';
