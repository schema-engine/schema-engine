/**
 * Global type augmentations for @json-form-engine/react
 *
 * This file ensures that all field type augmentations are available
 * when the package is included in tsconfig "types" array.
 */

import type { InputFieldConfig } from './components/form/fields/form-input.types';
import type { TextareaFieldConfig } from './components/form/fields/form-textarea.types';
import type { CheckboxFieldConfig } from './components/form/fields/form-checkbox.types';
import type { NumberFieldConfig } from './components/form/fields/form-number.types';
import type { RadioFieldConfig } from './components/form/fields/form-radio.types';
import type { SelectFieldConfig } from './components/form/fields/form-select.types';
import type { SwitchFieldConfig } from './components/form/fields/form-switch.types';
import type { ArrayElementsConfig } from './components/form/fields/form-array-elements.types';

declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			input: InputFieldConfig;
			textarea: TextareaFieldConfig;
			checkbox: CheckboxFieldConfig;
			number: NumberFieldConfig;
			radio: RadioFieldConfig;
			select: SelectFieldConfig;
			switch: SwitchFieldConfig;
			arrayElements: ArrayElementsConfig;
		}
	}
}
