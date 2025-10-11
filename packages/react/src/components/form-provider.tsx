import { useFormAdapter } from '../adapters/context';
import type { FormProviderProps } from '../adapters/types';

/**
 * Form provider that delegates to the selected adapter
 * This is the main form provider that should be used for new implementations
 */
export function FormProvider<TFormData = Record<string, unknown>>(props: FormProviderProps<TFormData>) {
	const adapter = useFormAdapter<TFormData>();
	const { FormProvider: AdapterFormProvider } = adapter;

	return <AdapterFormProvider {...props} />;
}
