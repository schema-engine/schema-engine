/**
 * Per-component registration re-exports with type augmentation
 *
 * Each import triggers type augmentation for that specific component only.
 * This ensures that only the components you actually use are registered in the type system.
 *
 * @example Individual Import (Recommended)
 * ```typescript
 * import { InputElementRegistration } from '@json-form-engine/react/components/elements/inputs/form-input.registration';
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

export { InputElementRegistration } from './components/elements/inputs/form-input.registration';
export { TextareaElementRegistration } from './components/elements/inputs/form-textarea.registration';
export { CheckboxElementRegistration } from './components/elements/inputs/form-checkbox.registration';
export { RadioElementRegistration } from './components/elements/inputs/form-radio.registration';
export { SelectElementRegistration } from './components/elements/inputs/form-select.registration';
export { SwitchElementRegistration } from './components/elements/inputs/form-switch.registration';
export { NumberElementRegistration } from './components/elements/inputs/form-number.registration';
export { ArrayElementRegistration } from './components/elements/inputs/form-array-elements.registration';
export { SubmitButtonElementRegistration } from './components/elements/actions/submit-button.registration';

export { CardLayoutRegistration } from './components/layouts/card-layout.registration';
export { SplitScreenLayoutRegistration } from './components/layouts/split-screen-layout.registration';
export { HeroBackgroundLayoutRegistration } from './components/layouts/hero-background-layout.registration';

export { DefaultStepperRegistration } from './components/steppers/default-stepper.registration';
export { VerticalStepperRegistration } from './components/steppers/vertical-stepper.registration';
export { MinimalistStepperRegistration } from './components/steppers/minimalist-stepper.registration';
export { DebuggerStepperRegistration } from './components/steppers/debugger-stepper.registration';
