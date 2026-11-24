import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/elements/inputs/form-textarea.registration';
import { NumberElementRegistration } from '@/elements/inputs/form-number.registration';
import { SelectElementRegistration } from '@/elements/inputs/form-select.registration';
import { CheckboxElementRegistration } from '@/elements/inputs/form-checkbox.registration';
import { CheckboxGroupElementRegistration } from '@/elements/inputs/form-checkbox-group.registration';
import { SwitchElementRegistration } from '@/elements/inputs/form-switch.registration';
import { RadioElementRegistration } from '@/elements/inputs/form-radio.registration';
import { SliderElementRegistration } from '@/elements/inputs/form-slider.registration';
import { ComboboxElementRegistration } from '@/elements/inputs/form-combobox.registration';
import { DropZoneElementRegistration } from '@/elements/inputs/form-drop-zone.registration';
import { FieldSetRegistration } from '@/elements/inputs/form-fieldset.registration';
import { InputOTPElementRegistration } from '@/elements/inputs/form-input-otp.registration';
import { PhoneInputElementRegistration } from '@/elements/inputs/form-phone-input.registration';
import { MaskedInputElementRegistration } from '@/elements/inputs/form-masked-input.registration';
import { ArrayElementRegistration } from '@/elements/inputs/form-array-elements.registration';
import { SubmitButtonElementRegistration } from '@/elements/actions/submit-button.registration';
import { SubmissionAlertElementRegistration } from '@/elements/content/form-submission-alert.registration';

export * from './elements';

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
