import { useFormContext as useRHFContext } from 'react-hook-form';
import type { FormContextValue } from '../../types';
import type { FieldValues } from 'react-hook-form';

export function useFormContext<TFormData extends FieldValues = Record<string, unknown>>(): FormContextValue<TFormData> {
	const form = useRHFContext<TFormData>();

	return {
		getValues: form.getValues,
		setValue: (name: string, value: unknown) => form.setValue(name as any, value as any),
		trigger: form.trigger as any,
		setFocus: (name: string) => form.setFocus(name as any),
		formState: {
			errors: form.formState.errors as Record<string, { message?: string }>,
			isValid: form.formState.isValid,
			isSubmitting: form.formState.isSubmitting,
			touchedFields: form.formState.touchedFields as Record<string, boolean>,
			submitCount: form.formState.submitCount,
			defaultValues: form.formState.defaultValues as Partial<TFormData>,
		},
	};
}
