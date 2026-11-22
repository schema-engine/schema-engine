import { useMemo, useSyncExternalStore } from 'react';
import { selectValue, type FormStateContainer, type FormStateSnapshot } from '@schema-engine/forms/state-container';
import { useFormStateContext } from './context';

/**
 * The store of one `useWatchField` call: the values at `names`, as the same array while none of them changed.
 *
 * @remarks
 * Kept per call, so two components never share or overwrite a list, and a render never builds a new one for
 * unchanged values, which `useSyncExternalStore` would take for a change.
 */
function createWatchStore(container: FormStateContainer, names: readonly string[]) {
	let last: readonly unknown[] = [];
	const read = (snapshot: FormStateSnapshot): readonly unknown[] => {
		const next = names.map((path) => selectValue(snapshot, path));
		if (next.length === last.length && next.every((value, index) => Object.is(value, last[index]))) return last;
		last = next;
		return next;
	};
	return {
		subscribe: (listener: () => void) => container.subscribe(listener),
		getSnapshot: () => read(container.getSnapshot()),
		getServerSnapshot: () => read(container.getServerSnapshot()),
	};
}

/** Watches the values at `names`, in the order given; the same array while none changed. */
export function useWatchPaths(names: readonly string[]): readonly unknown[] {
	const { container } = useFormStateContext();
	const key = JSON.stringify(names);
	const store = useMemo(() => createWatchStore(container, JSON.parse(key)), [container, key]);
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/** Watches the value at one path, as `unknown`: the caller narrows it. */
export function useWatchField(name: string): unknown;
/** Watches the values at several paths, in the order given; the same array while none changed. */
export function useWatchField(names: readonly string[]): readonly unknown[];
export function useWatchField(name: string | readonly string[]): unknown {
	const values = useWatchPaths(typeof name === 'string' ? [name] : name);
	return typeof name === 'string' ? values[0] : values;
}
