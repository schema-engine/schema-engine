import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import { useFormAdapter } from '../adapters/context';
import type { FormProviderProps } from '../adapters/types';

/**
 * Form provider that delegates to the selected adapter
 * This is the main form provider that should be used for new implementations
 */
export function FormProvider<
	TFormData = Record<string, unknown>,
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>(props: FormProviderProps<TFormData, TElements, TRecipes, TActions, TOutputs>) {
	const adapter = useFormAdapter<TFormData, TElements, TRecipes, TActions, TOutputs>();
	const { FormProvider: AdapterFormProvider } = adapter;

	return <AdapterFormProvider {...props} />;
}
