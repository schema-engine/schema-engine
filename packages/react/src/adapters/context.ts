import { createContext, useContext } from 'react';
import type { FormAdapter } from './types';

export const FormAdapterContext = createContext<FormAdapter | null>(null);

export function useFormAdapter<TFormData = Record<string, unknown>>(): FormAdapter<TFormData> {
	const adapter = useContext(FormAdapterContext);
	if (!adapter) {
		throw new Error('useFormAdapter must be used within a FormEngine with a valid adapter');
	}
	return adapter as FormAdapter<TFormData>;
}

export function useFormContext<TFormData = Record<string, unknown>>() {
	const adapter = useFormAdapter<TFormData>();
	return adapter.useFormContext();
}

export function useFormField<TFieldValue = unknown>(config: FormEngine.ElementConfig) {
	const adapter = useFormAdapter();
	return adapter.useFormField<TFieldValue>(config);
}

export function useWatchField<TWatchValue = unknown, TFormData = Record<string, unknown>>(name: string | string[]) {
	const adapter = useFormAdapter<TFormData>();
	return adapter.useWatchField<TWatchValue>(name);
}
