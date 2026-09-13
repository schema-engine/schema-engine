import { getActiveFormStore } from '../../store/active-store';

/**
 * Returns a snapshot of all values from the active form store.
 *
 * @param defaultValues - Optional fallback values to merge with store values.
 * @returns The form data object.
 */
export function useWatchForm<TFormData = Record<string, unknown>>(defaultValues?: TFormData): TFormData {
	const store = getActiveFormStore();
	const values = store.getValues() as TFormData;
	return defaultValues ? ({ ...defaultValues, ...values } as TFormData) : values;
}
