/**
 * Type definitions entry point for @json-form-engine/react
 *
 * This file aggregates all type augmentations and makes them available
 * when the package is referenced in tsconfig "types" array.
 *
 * By importing these type files, their module augmentations are applied,
 * extending FormEngine.ElementRegistry with all built-in field types.
 */

import type { InputFieldConfig } from './components/elements/shadcn/inputs/form-input.types';
import type { TextareaFieldConfig } from './components/elements/shadcn/inputs/form-textarea.types';
import type { CheckboxFieldConfig } from './components/elements/shadcn/inputs/form-checkbox.types';
import type { NumberFieldConfig } from './components/elements/shadcn/inputs/form-number.types';
import type { RadioFieldConfig } from './components/elements/shadcn/inputs/form-radio.types';
import type { SelectFieldConfig } from './components/elements/shadcn/inputs/form-select.types';
import type { SwitchFieldConfig } from './components/elements/shadcn/inputs/form-switch.types';
import type { ArrayElementsConfig } from './components/elements/shadcn/inputs/form-array-elements.types';

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
