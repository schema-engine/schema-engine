import { bindRegistry } from '@schema-engine/registry';
import { defaultElementContracts, type ElementBindings } from '@schema-engine/forms/default-elements';
import { createRadiantPhoneValidationRegistration } from '../lib/phone-validation.js';
import { SubmitButton } from './actions/submit-button.js';
import { FormSubmissionAlert } from './content/form-submission-alert.js';
import { FormArrayElements } from './inputs/form-array-elements.js';
import { FormCheckboxGroup } from './inputs/form-checkbox-group.js';
import { FormCheckbox } from './inputs/form-checkbox.js';
import { FormCombobox } from './inputs/form-combobox.js';
import { FormDropZone } from './inputs/form-drop-zone.js';
import { FormFieldSet } from './inputs/form-fieldset.js';
import { FormInputOTP } from './inputs/form-input-otp.js';
import { FormInput } from './inputs/form-input.js';
import { FormMaskedInput } from './inputs/form-masked-input.js';
import { FormNumber } from './inputs/form-number.js';
import { FormPhoneInput } from './inputs/form-phone-input.js';
import { FormRadio } from './inputs/form-radio.js';
import { FormSelect } from './inputs/form-select.js';
import { FormSlider } from './inputs/form-slider.js';
import { FormSwitch } from './inputs/form-switch.js';
import { FormTextarea } from './inputs/form-textarea.js';

/**
 * Every element of the package: the contracts of `@schema-engine/forms/default-elements` with the Radiant component of each.
 *
 * @remarks
 * The schema, metadata and value each element writes belong to its contract, shared with every other renderer. The
 * binding adds only the Radiant `render`, and the phone input's own `validations`. `bindRegistry` fails to compile, and
 * fails to build, when a contract has no binding here.
 */
export const radiantElements = bindRegistry(defaultElementContracts, {
	submit: { render: SubmitButton },
	'submission-alert': { render: FormSubmissionAlert },
	arrayElements: { render: FormArrayElements },
	'checkbox-group': { render: FormCheckboxGroup },
	checkbox: { render: FormCheckbox },
	combobox: { render: FormCombobox },
	'drop-zone': { render: FormDropZone },
	fieldSet: { render: FormFieldSet },
	'input-otp': { render: FormInputOTP },
	input: { render: FormInput },
	'masked-input': { render: FormMaskedInput },
	number: { render: FormNumber },
	'phone-input': { render: FormPhoneInput, validations: [createRadiantPhoneValidationRegistration()] },
	radio: { render: FormRadio },
	select: { render: FormSelect },
	slider: { render: FormSlider },
	switch: { render: FormSwitch },
	textarea: { render: FormTextarea },
} satisfies ElementBindings<typeof defaultElementContracts>);
