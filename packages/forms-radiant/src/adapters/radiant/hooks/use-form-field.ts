import type { FormFieldValue } from '../../types';
import { bindControlledFormElement } from '@/hooks/bind-field';

export function useFormField<TFieldValue = unknown>(config: FormEngine.ElementConfig): FormFieldValue<TFieldValue> {
	return bindControlledFormElement<TFieldValue>(config) as FormFieldValue<TFieldValue>;
}
