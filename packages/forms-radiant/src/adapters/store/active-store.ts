import type { FormStore } from './form-store';

let activeStore: FormStore | null = null;

export function setActiveFormStore(store: FormStore | null): void {
	activeStore = store;
}

export function getActiveFormStore(): FormStore {
	if (!activeStore) {
		throw new Error('No active FormStore. Use FormProvider to wrap form fields.');
	}
	return activeStore;
}
