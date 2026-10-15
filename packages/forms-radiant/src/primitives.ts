/**
 * Stable contracts for element authors and registry consumers.
 */
export { bindControlledFormElement, combineHandlers } from '@/hooks/bind-field';
export { FormElement } from '@/components/internals/field-renderer';

export { FormField, FormFieldElement } from '@/elements/form-field';
export {
	FormController,
	FormEngineController,
	formController,
	type FormControllerHost,
} from '@/adapters/radiant/controller';
