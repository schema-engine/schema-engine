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
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

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
		.addRecipes(schemaFormRecipeRegistrations)
		.addAction(SubmitActionRegistration)
		.addAction(ResetActionRegistration);
}

const baseUIEngine = createBaseUIFormComposer().build();

export function getEngine() {
	return baseUIEngine;
}

export function defineStoryForm<const TConfig extends Parameters<typeof baseUIEngine.defineForm>[0]>(config: TConfig) {
	return baseUIEngine.defineForm(config);
}

export function createExtendableComposer() {
	return createBaseUIFormComposer().clone();
}

export { rhfAdapter } from '@/adapters/react-hook-form';
