/**
 * Type definitions entry point for @json-form-engine/react
 *
 * This file aggregates all type augmentations and makes them available
 * when the package is referenced in tsconfig "types" array.
 *
 * By importing these type files, their module augmentations are applied,
 * extending FormEngine.FieldConfigRegistry with all built-in field types.
 */

import type { InputFieldConfig } from './components/form/fields/form-input.types';
import type { TextareaFieldConfig } from './components/form/fields/form-textarea.types';
import type { CheckboxFieldConfig } from './components/form/fields/form-checkbox.types';
import type { NumberFieldConfig } from './components/form/fields/form-number.types';
import type { RadioFieldConfig } from './components/form/fields/form-radio.types';
import type { SelectFieldConfig } from './components/form/fields/form-select.types';
import type { SwitchFieldConfig } from './components/form/fields/form-switch.types';
import type { ArrayElementsConfig } from './components/form/fields/form-array-elements.types';

/**
 * Re-export all field types to ensure imports are preserved in .d.ts output
 */
export type {
	InputFieldConfig,
	TextareaFieldConfig,
	CheckboxFieldConfig,
	NumberFieldConfig,
	RadioFieldConfig,
	SelectFieldConfig,
	SwitchFieldConfig,
	ArrayElementsConfig,
};
