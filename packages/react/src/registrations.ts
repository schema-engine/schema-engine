/**
 * Per-component registration re-exports with type augmentation
 *
 * Each import triggers type augmentation for that specific component only.
 * This ensures that only the components you actually use are registered in the type system.
 *
 * @example Individual Import (Recommended)
 * ```typescript
 * import { InputElementRegistration } from '@json-form-engine/react/components/form/fields/form-input.registration';
 * ```
 *
 * @example Multiple Imports from this file
 * ```typescript
 * import {
 *   InputElementRegistration,
 *   TextareaElementRegistration
 * } from '@json-form-engine/react/registrations';
 * ```
 *
 * Benefits:
 * - Only imported components are type-registered
 * - Multiple builders with different components work correctly
 * - No "scary magic" - explicit is better than implicit
 * - Tree-shakeable - unused components don't affect bundle size or types
 */

export { InputElementRegistration } from './components/form/fields/form-input.registration';
export { TextareaElementRegistration } from './components/form/fields/form-textarea.registration';
export { CheckboxElementRegistration } from './components/form/fields/form-checkbox.registration';
export { RadioElementRegistration } from './components/form/fields/form-radio.registration';
export { SelectElementRegistration } from './components/form/fields/form-select.registration';
export { SwitchElementRegistration } from './components/form/fields/form-switch.registration';
export { NumberElementRegistration } from './components/form/fields/form-number.registration';
export { ArrayElementRegistration } from './components/form/fields/form-array-elements.registration';

export { CardLayoutRegistration } from './components/layouts/card-layout.registration';
export { SplitScreenLayoutRegistration } from './components/layouts/split-screen-layout.registration';
export { HeroBackgroundLayoutRegistration } from './components/layouts/hero-background-layout.registration';

export { DefaultStepperRegistration } from './components/steppers/default-stepper.registration';
export { VerticalStepperRegistration } from './components/steppers/vertical-stepper.registration';
export { MinimalistStepperRegistration } from './components/steppers/minimalist-stepper.registration';
export { DebuggerStepperRegistration } from './components/steppers/debugger-stepper.registration';
