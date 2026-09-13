import type { FormStore } from '@ecopages/radiant-ui/form';
import { flattenValues } from './values';

const updating = new WeakSet<FormStore>();

export function isWritingValue(store: FormStore): boolean {
	return updating.has(store);
}

/**
 * @remarks
 * Radiant UI addresses registered controls by flat names. Replace the branch and
 * synchronize those controls before notifying controller subscribers. Removed
 * controls receive undefined until the renderer unregisters them.
 */
export function writeValue(store: FormStore, name: string, value: unknown): void {
	const belongsToBranch = (field: string) => field === name || field.startsWith(`${name}.`);
	const next = {
		...Object.fromEntries(Object.entries(store.values).filter(([field]) => !belongsToBranch(field))),
		...flattenValues({ [name]: value }),
	};
	updating.add(store);
	try {
		store.values = next;
		for (const field of store.getRegisteredFieldNames()) {
			if (belongsToBranch(field) && field !== name) store.setValue(field, next[field]);
		}
		store.values = next;
	} finally {
		updating.delete(store);
	}
	store.setValue(name, value, { shouldDirty: true });
}
