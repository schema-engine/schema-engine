/**
 * Default registrations for @json-form-engine/react
 *
 * This file registers all default form components, layouts, and steppers.
 * Import this once in your application to have access to all built-in components.
 *
 * @example
 * ```typescript
 * import '@json-form-engine/react/registrations';
 * ```
 */

import './components/form/fields/form-checkbox.registry';
import './components/form/fields/form-input.registry';
import './components/form/fields/form-number.registry';
import './components/form/fields/form-radio.registry';
import './components/form/fields/form-select.registry';
import './components/form/fields/form-textarea.registry';
import './components/form/fields/form-switch.registry';
import './components/form/fields/form-array-elements.registry';

import './components/layouts/card-layout.registry';
import './components/layouts/split-screen-layout.registry';
import './components/layouts/hero-background-layout.registry';

import './components/steppers/default-stepper.registry';
import './components/steppers/vertical-stepper.registry';
import './components/steppers/minimalist-stepper.registry';

import type { InputFieldConfig } from './components/form/fields/form-input.types';
import type { TextareaFieldConfig } from './components/form/fields/form-textarea.types';
import type { CheckboxFieldConfig } from './components/form/fields/form-checkbox.types';
import type { NumberFieldConfig } from './components/form/fields/form-number.types';
import type { RadioFieldConfig } from './components/form/fields/form-radio.types';
import type { SelectFieldConfig } from './components/form/fields/form-select.types';
import type { SwitchFieldConfig } from './components/form/fields/form-switch.types';
import type { ArrayElementsConfig } from './components/form/fields/form-array-elements.types';

/**
 * Global namespace augmentation for internal package usage.
 * This allows components within the package to reference FormEngine types
 * without explicit imports (e.g., FormEngine.FieldConfig, FormEngine.FieldRegistration).
 */
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

/**
 * Module augmentation for external consumers.
 * This allows users of the library to extend the FieldConfigRegistry
 * with their own custom field types when using @json-form-engine/react.
 */
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
