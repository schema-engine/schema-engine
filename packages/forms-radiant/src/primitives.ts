/**
 * Stable contracts for element authors and registry consumers.
 */
export { bindControlledFormElement, combineHandlers } from '@/hooks/bind-field';
export { bindField, type BindFieldConfig, type BindFieldReturn } from '@/lib/bind-field';
export { FormElement } from '@/components/internals/field-renderer';

export { FormField, FormFieldElement } from '@/elements/form-field';
export { FormController, formController, type FormControllerHost } from '@/adapters/radiant/controller';
