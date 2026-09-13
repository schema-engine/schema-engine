import type { FormContextValue } from '../../types';
import { getActiveFormStore } from '../../store/active-store';

export function useFormContext(): FormContextValue {
	return getActiveFormStore().getContext();
}
