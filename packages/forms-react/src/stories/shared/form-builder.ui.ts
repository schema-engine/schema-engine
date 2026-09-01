/**
 * Base UI Form Builder for Storybook
 *
 * Registers every Schema Engine form element from the Base UI registry source.
 * Elements are added individually so FormComposer keeps a typed element map.
 */

import { ValidationPresets } from '@schema-engine/forms/schemas/validation';
import { SubmitActionRegistration, ResetActionRegistration } from '@schema-engine/forms';
import { createReactFormComposer } from '@/registries/builder-registry';
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
	DateElementRegistration,
	DateRangeElementRegistration,
} from '@/components/schema-engine/forms/registrations';

import '@/components/shells/card-shell.css';
import '@/components/shells/split-screen-shell.css';
import '@/components/shells/hero-shell.css';
import '@/components/internals/recipe-renderer.css';

export { ValidationPresets };

function createBaseUIFormComposer() {
	return createReactFormComposer()
		.addElement(InputElementRegistration)
		.addElement(TextareaElementRegistration)
		.addElement(CheckboxElementRegistration)
		.addElement(RadioElementRegistration)
		.addElement(SelectElementRegistration)
		.addElement(ComboboxElementRegistration)
		.addElement(SwitchElementRegistration)
		.addElement(NumberElementRegistration)
		.addElement(SliderElementRegistration)
		.addElement(DateElementRegistration)
		.addElement(DateRangeElementRegistration)
		.addElement(CheckboxGroupElementRegistration)
		.addElement(InputOTPElementRegistration)
		.addElement(PhoneInputElementRegistration)
		.addElement(MaskedInputElementRegistration)
		.addElement(DropZoneElementRegistration)
		.addElement(ArrayElementRegistration)
		.addElement(FieldSetRegistration)
		.addElement(SubmitButtonElementRegistration)
		.addElement(SubmissionAlertElementRegistration)
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
