import { InputElementRegistration } from '@/elements/inputs/form-input.registration.js';
import { TextareaElementRegistration } from '@/elements/inputs/form-textarea.registration.js';
import { NumberElementRegistration } from '@/elements/inputs/form-number.registration.js';
import { SelectElementRegistration } from '@/elements/inputs/form-select.registration.js';
import { CheckboxElementRegistration } from '@/elements/inputs/form-checkbox.registration.js';
import { CheckboxGroupElementRegistration } from '@/elements/inputs/form-checkbox-group.registration.js';
import { SwitchElementRegistration } from '@/elements/inputs/form-switch.registration.js';
import { RadioElementRegistration } from '@/elements/inputs/form-radio.registration.js';
import { SliderElementRegistration } from '@/elements/inputs/form-slider.registration.js';
import { ComboboxElementRegistration } from '@/elements/inputs/form-combobox.registration.js';
import { DropZoneElementRegistration } from '@/elements/inputs/form-drop-zone.registration.js';
import { FieldSetRegistration } from '@/elements/inputs/form-fieldset.registration.js';
import { InputOTPElementRegistration } from '@/elements/inputs/form-input-otp.registration.js';
import { PhoneInputElementRegistration } from '@/elements/inputs/form-phone-input.registration.js';
import { MaskedInputElementRegistration } from '@/elements/inputs/form-masked-input.registration.js';
import { ArrayElementRegistration } from '@/elements/inputs/form-array-elements.registration.js';
import { SubmitButtonElementRegistration } from '@/elements/actions/submit-button.registration.js';
import { SubmissionAlertElementRegistration } from '@/elements/content/form-submission-alert.registration.js';

export * from './elements.js';

/**
 * Every element registration of the package, in registration order.
 *
 * @remarks
 * Annotated as a tuple of the registrations' own types: with the validation rules carrying `id` and
 * `severity`, the type the compiler infers for the array is too long to write into a declaration file.
 */
export const schemaFormRegistrations: readonly [
	typeof InputElementRegistration,
	typeof TextareaElementRegistration,
	typeof NumberElementRegistration,
	typeof SelectElementRegistration,
	typeof CheckboxElementRegistration,
	typeof CheckboxGroupElementRegistration,
	typeof SwitchElementRegistration,
	typeof RadioElementRegistration,
	typeof SliderElementRegistration,
	typeof ComboboxElementRegistration,
	typeof DropZoneElementRegistration,
	typeof FieldSetRegistration,
	typeof InputOTPElementRegistration,
	typeof PhoneInputElementRegistration,
	typeof MaskedInputElementRegistration,
	typeof ArrayElementRegistration,
	typeof SubmitButtonElementRegistration,
	typeof SubmissionAlertElementRegistration,
] = [
	InputElementRegistration,
	TextareaElementRegistration,
	NumberElementRegistration,
	SelectElementRegistration,
	CheckboxElementRegistration,
	CheckboxGroupElementRegistration,
	SwitchElementRegistration,
	RadioElementRegistration,
	SliderElementRegistration,
	ComboboxElementRegistration,
	DropZoneElementRegistration,
	FieldSetRegistration,
	InputOTPElementRegistration,
	PhoneInputElementRegistration,
	MaskedInputElementRegistration,
	ArrayElementRegistration,
	SubmitButtonElementRegistration,
	SubmissionAlertElementRegistration,
];
