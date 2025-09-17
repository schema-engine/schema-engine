import './fields/form-checkbox.registry';
import './fields/form-input.registry';
import './fields/form-number.registry';
import './fields/form-radio.registry';
import './fields/form-select.registry';
import './fields/form-textarea.registry';
import './fields/form-switch.registry';
import './fields/form-array-elements.registry';

import type { InputFieldConfig } from './fields/form-input.types';
import type { TextareaFieldConfig } from './fields/form-textarea.types';
import type { CheckboxFieldConfig } from './fields/form-checkbox.types';
import type { NumberFieldConfig } from './fields/form-number.types';
import type { RadioFieldConfig } from './fields/form-radio.types';
import type { SelectFieldConfig } from './fields/form-select.types';
import type { SwitchFieldConfig } from './fields/form-switch.types';
import type { ArrayElementsConfig } from './fields/form-array-elements.types';

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

declare module '@json-form-engine/react' {
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
