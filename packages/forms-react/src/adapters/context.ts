import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import { createContext, useContext } from 'react';
import type { FormAdapter } from './types';
import type { ElementConfig } from '@schema-engine/forms/schemas';

export const FormAdapterContext = createContext<FormAdapter | null>(null);

export function useFormAdapter<
	TFormData = Record<string, unknown>,
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>(): FormAdapter<TFormData, TElements, TRecipes, TActions, TOutputs> {
	const adapter = useContext(FormAdapterContext);
	if (!adapter) {
		throw new Error('useFormAdapter must be used within a FormEngine with a valid adapter');
	}
	return adapter as unknown as FormAdapter<TFormData, TElements, TRecipes, TActions, TOutputs>;
}

export function useFormContext<TFormData = Record<string, unknown>>() {
	const adapter = useFormAdapter<TFormData>();
	return adapter.useFormContext();
}

export function useFormField<TFieldValue = unknown>(config: ElementConfig) {
	const adapter = useFormAdapter();
	return adapter.useFormField<TFieldValue>(config);
}

export function useWatchField<TWatchValue = unknown, TFormData = Record<string, unknown>>(name: string | string[]) {
	const adapter = useFormAdapter<TFormData>();
	return adapter.useWatchField<TWatchValue>(name);
}

export function useWatchForm<TFormData = Record<string, unknown>>() {
	const adapter = useFormAdapter<TFormData>();
	return adapter.useWatchForm();
}

export function useFieldArray(name: string) {
	const adapter = useFormAdapter();
	return adapter.useFieldArray(name);
}
