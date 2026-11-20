import { useFormContext as useRHFContext } from 'react-hook-form';
import type { FormContextValue } from '../../types';
import type { FieldValues } from 'react-hook-form';

/**
 * @remarks
 * `formState` reads React Hook Form's tracked proxy through getters, so a caller subscribes only to
 * the fields it reads. Reading `isValid` turns on full-form validation after every change for the
 * rest of the form's life, so a caller that does not need it must not touch it, which a spread or an
 * eager read of the whole state would. The context is typed with `FieldValues`; `getValues` and
 * `defaultValues` are cast to `TFormData` because the provider cannot infer the consumer's form data,
 * and `errors` to the nodes' `message` shape, which omits React Hook Form's `undefined` entries.
 */
export function useFormContext<TFormData extends FieldValues = Record<string, unknown>>(): FormContextValue<TFormData> {
	const form = useRHFContext<FieldValues>();

	return {
		getValues: () => form.getValues() as TFormData,
		setValue: (name, value) => form.setValue(name, value),
		trigger: form.trigger,
		setFocus: (name) => form.setFocus(name),
		formState: {
			get errors() {
				return form.formState.errors as Record<string, { message?: string }>;
			},
			get isValid() {
				return form.formState.isValid;
			},
			get isSubmitting() {
				return form.formState.isSubmitting;
			},
			get touchedFields() {
				return form.formState.touchedFields;
			},
			get submitCount() {
				return form.formState.submitCount;
			},
			get defaultValues() {
				return form.formState.defaultValues as Partial<TFormData> | undefined;
			},
		},
	};
}
