import { useContainerSelector } from './context';
import type { FormValues } from './types';

/** Watches the whole value tree; the same object while no value changed. */
export function useWatchForm(): FormValues {
	return useContainerSelector((snapshot) => snapshot.values);
}
