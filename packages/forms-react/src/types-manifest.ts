/**
 * Type aggregation manifest for @schema-engine/forms-react (w6-02 spike).
 *
 * Single source of truth listing every built-in registration config type module.
 * Importing this file (via `types.ts` or `@schema-engine/forms-react/types`) loads
 * all module augmentations when consumers also import the matching `.registration` files.
 */

// --- Elements: inputs ---
import type { ArrayElementsConfig } from './components/elements/inputs/form-array-elements.types';
import type { CheckboxFieldConfig } from './components/elements/inputs/form-checkbox.types';
import type { CheckboxGroupFieldConfig } from './components/elements/inputs/form-checkbox-group.types';
import type { ComboboxFieldConfig } from './components/elements/inputs/form-combobox.types';
import type { DropZoneFieldConfig } from './components/elements/inputs/form-drop-zone.types';
import type { FieldSetConfig } from './components/elements/inputs/form-fieldset.types';
import type { InputFieldConfig } from './components/elements/inputs/form-input.types';
import type { InputOTPFieldConfig } from './components/elements/inputs/form-input-otp.types';
import type { NumberFieldConfig } from './components/elements/inputs/form-number.types';
import type { PhoneInputFieldConfig } from './components/elements/inputs/form-phone-input.types';
import type { RadioFieldConfig } from './components/elements/inputs/form-radio.types';
import type { SelectFieldConfig } from './components/elements/inputs/form-select.types';
import type { SliderFieldConfig } from './components/elements/inputs/form-slider.types';
import type { SwitchFieldConfig } from './components/elements/inputs/form-switch.types';
import type { TextareaFieldConfig } from './components/elements/inputs/form-textarea.types';

// --- Elements: actions ---
import type { SubmitButtonConfig } from './components/elements/actions/submit-button.types';

// --- Elements: content ---
import type { SubmissionAlertConfig } from './components/elements/content/form-submission-alert.types';

// --- Layouts ---
import type { CardLayoutConfig } from './components/layouts/card-layout.types';
import type { HeroBackgroundLayoutConfig } from './components/layouts/hero-background-layout.types';
import type { SplitScreenLayoutConfig } from './components/layouts/split-screen-layout.types';

// --- Steppers ---
import type { DebuggerStepperConfig } from './components/steppers/debugger-stepper.types';
import type { DefaultStepperConfig } from './components/steppers/default-stepper.types';
import type { MinimalistStepperConfig } from './components/steppers/minimalist-stepper.types';

/** Registration keys covered by this manifest (23 elements + 3 layouts + 3 steppers). */
export const TYPE_MANIFEST = {
	elements: {
		input: 'form-input.types',
		textarea: 'form-textarea.types',
		number: 'form-number.types',
		select: 'form-select.types',
		radio: 'form-radio.types',
		checkbox: 'form-checkbox.types',
		'checkbox-group': 'form-checkbox-group.types',
		switch: 'form-switch.types',
		slider: 'form-slider.types',
		'input-otp': 'form-input-otp.types',
		combobox: 'form-combobox.types',
		'phone-input': 'form-phone-input.types',
		'drop-zone': 'form-drop-zone.types',
		fieldset: 'form-fieldset.types',
		'array-elements': 'form-array-elements.types',
		submit: 'submit-button.types',
		'submission-alert': 'form-submission-alert.types',
	},
	layouts: {
		card: 'card-layout.types',
		'split-screen': 'split-screen-layout.types',
		'hero-background': 'hero-background-layout.types',
	},
	steppers: {
		default: 'default-stepper.types',
		minimalist: 'minimalist-stepper.types',
		debugger: 'debugger-stepper.types',
	},
} as const;

export type BuiltinElementType = keyof typeof TYPE_MANIFEST.elements;
export type BuiltinLayoutType = keyof typeof TYPE_MANIFEST.layouts;
export type BuiltinStepperType = keyof typeof TYPE_MANIFEST.steppers;

export type {
	ArrayElementsConfig,
	CardLayoutConfig,
	CheckboxFieldConfig,
	CheckboxGroupFieldConfig,
	ComboboxFieldConfig,
	DebuggerStepperConfig,
	DefaultStepperConfig,
	DropZoneFieldConfig,
	FieldSetConfig,
	HeroBackgroundLayoutConfig,
	InputFieldConfig,
	InputOTPFieldConfig,
	MinimalistStepperConfig,
	NumberFieldConfig,
	PhoneInputFieldConfig,
	RadioFieldConfig,
	SelectFieldConfig,
	SliderFieldConfig,
	SplitScreenLayoutConfig,
	SubmissionAlertConfig,
	SubmitButtonConfig,
	SwitchFieldConfig,
	TextareaFieldConfig,
};
