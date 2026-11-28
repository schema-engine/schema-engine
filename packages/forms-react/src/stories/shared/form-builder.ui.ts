/**
 * Base UI form engine for Storybook
 *
 * Registers every Schema Engine form element from the Base UI registry source.
 */

import { ValidationPresets, SubmitActionRegistration, createFormEngine } from '@schema-engine/forms';
import { ResetActionRegistration } from '@schema-engine/forms/browser';
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
} from '@/components/schema-engine/forms/registrations.js';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations.js';

export { ValidationPresets };

const baseUIEngine = createFormEngine({
	elements: [
		InputElementRegistration,
		TextareaElementRegistration,
		CheckboxElementRegistration,
		RadioElementRegistration,
		SelectElementRegistration,
		ComboboxElementRegistration,
		SwitchElementRegistration,
		NumberElementRegistration,
		SliderElementRegistration,
		DateElementRegistration,
		DateRangeElementRegistration,
		CheckboxGroupElementRegistration,
		InputOTPElementRegistration,
		PhoneInputElementRegistration,
		MaskedInputElementRegistration,
		DropZoneElementRegistration,
		ArrayElementRegistration,
		FieldSetRegistration,
		SubmitButtonElementRegistration,
		SubmissionAlertElementRegistration,
	],
	recipes: schemaFormRecipeRegistrations,
	actions: [SubmitActionRegistration, ResetActionRegistration],
});

export function getEngine(): typeof baseUIEngine {
	return baseUIEngine;
}

export const defineStoryForm = baseUIEngine.defineForm.bind(baseUIEngine);
