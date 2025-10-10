/**
 * Default element registrations for @json-form-engine/react
 *
 * This file exports all default form components that can be used with the new builder pattern.
 * Import these to add them to your form engine instance.
 *
 * @example
 * ```typescript
 * import { createReactFormEngine, toElementRegistration } from '@json-form-engine/react';
 * import { InputElement, TextareaElement } from '@json-form-engine/react/registrations';
 *
 * const engine = createReactFormEngine()
 *   .addElement(toElementRegistration(InputElement))
 *   .addElement(toElementRegistration(TextareaElement))
 *   .build();
 * ```
 */

import type { InputFieldConfig } from './components/form/fields/form-input.types';
import type { TextareaFieldConfig } from './components/form/fields/form-textarea.types';
import type { CheckboxFieldConfig } from './components/form/fields/form-checkbox.types';
import type { NumberFieldConfig } from './components/form/fields/form-number.types';
import type { RadioFieldConfig } from './components/form/fields/form-radio.types';
import type { SelectFieldConfig } from './components/form/fields/form-select.types';
import type { SwitchFieldConfig } from './components/form/fields/form-switch.types';
import type { ArrayElementsConfig } from './components/form/fields/form-array-elements.types';

export { InputElement } from './components/form/fields/form-input';

export { CardLayoutRegistration } from './components/layouts/card-layout';
export { SplitScreenLayoutRegistration } from './components/layouts/split-screen-layout';
export { HeroBackgroundLayoutRegistration } from './components/layouts/hero-background-layout';

export { DefaultStepperRegistration } from './components/steppers/default-stepper';
export { VerticalStepperRegistration } from './components/steppers/vertical-stepper';
export { MinimalistStepperRegistration } from './components/steppers/minimalist-stepper';
export { DebuggerStepperRegistration } from './components/steppers/debugger-stepper';

import type { CardLayoutConfig } from './components/layouts/card-layout.types';
import type { SplitScreenLayoutConfig } from './components/layouts/split-screen-layout.types';
import type { HeroBackgroundLayoutConfig } from './components/layouts/hero-background-layout.types';
import type { DefaultStepperConfig } from './components/steppers/default-stepper.types';
import type { MinimalistStepperConfig } from './components/steppers/minimalist-stepper.types';
import type { VerticalStepsStepperConfig } from './components/steppers/vertical-stepper.types';
import type { DebuggerStepperConfig } from './components/steppers/debugger-stepper.types';

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

		interface LayoutConfigRegistry {
			card: CardLayoutConfig;
			'split-screen': SplitScreenLayoutConfig;
			'hero-background': HeroBackgroundLayoutConfig;
		}

		interface StepperConfigRegistry {
			default: DefaultStepperConfig;
			minimalist: MinimalistStepperConfig;
			vertical: VerticalStepsStepperConfig;
			debugger: DebuggerStepperConfig;
		}
	}
}
