import { getActiveFormStore } from '../../store/active-store';

/**
 * Watches a field or list of fields from the active form store.
 *
 * @param name - The field name or array of field names to watch.
 * @param defaultValue - Optional fallback value returned when field has no value in store.
 * @returns The watched field value or array of values.
 */
export function useWatchField<TWatchValue = unknown>(name: string | string[], defaultValue?: TWatchValue): TWatchValue {
	const store = getActiveFormStore();
	if (Array.isArray(name)) {
		return name.map((fieldName, index) => {
			const value = store.getValue(fieldName);
			return value !== undefined ? value : Array.isArray(defaultValue) ? defaultValue[index] : undefined;
		}) as TWatchValue;
	}
	const value = store.getValue(name);
	return (value !== undefined ? value : defaultValue) as TWatchValue;
}
