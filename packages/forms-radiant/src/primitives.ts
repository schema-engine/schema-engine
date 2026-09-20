/**
 * Stable contracts for element authors and registry consumers.
 */
export { bindControlledFormElement, combineHandlers } from '@/hooks/bind-field';
export {
	bindField,
	type BindFieldConfig,
	type BindFieldReturn,
	type BindFieldHostProps,
	type FieldGroupChromeProps,
} from '@/lib/bind-field';
export { FormElement } from '@/components/internals/field-renderer';

export { FormField, FormFieldElement } from '@/elements/form-field';
export { FieldGroup, type FieldGroupProps } from '@/elements/field-group';
export { FormController, formController, type FormControllerHost } from '@/adapters/radiant/controller';
