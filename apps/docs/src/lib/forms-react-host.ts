/**
 * Single import graph for the docs FormRenderer island.
 * Every forms-react runtime import in the island must go through this module
 * so mount, adapter, composer, and registrations share one copy of React.
 */
export { createReactFormComposer } from '@schema-engine/forms-react/registries/builder-registry';
export { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';
export { mountFormRenderer } from '@schema-engine/forms-react/mount-form-renderer';
export { InputElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-input.registration';
export { TextareaElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-textarea.registration';
export { CheckboxElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-checkbox.registration';
export { RadioElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-radio.registration';
export { SelectElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-select.registration';
export { SwitchElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-switch.registration';
export { NumberElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-number.registration';
export { ArrayElementRegistration } from '@schema-engine/forms-react/components/elements/inputs/form-array-elements.registration';
export { SubmitButtonElementRegistration } from '@schema-engine/forms-react/components/elements/actions/submit-button.registration';
export { SubmissionAlertElementRegistration } from '@schema-engine/forms-react/components/elements/content/form-submission-alert.registration';
export { CardLayoutRegistration } from '@schema-engine/forms-react/components/layouts/card-layout.registration';
export { SplitScreenLayoutRegistration } from '@schema-engine/forms-react/components/layouts/split-screen-layout.registration';
export { HeroBackgroundLayoutRegistration } from '@schema-engine/forms-react/components/layouts/hero-background-layout.registration';
export { DefaultStepperRegistration } from '@schema-engine/forms-react/components/steppers/default-stepper.registration';
export { MinimalistStepperRegistration } from '@schema-engine/forms-react/components/steppers/minimalist-stepper.registration';
export { DebuggerStepperRegistration } from '@schema-engine/forms-react/components/steppers/debugger-stepper.registration';
