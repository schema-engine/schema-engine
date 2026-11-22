import { useMemo, useSyncExternalStore } from 'react';
import { selectValue, type FormStateContainer, type FormStateSnapshot } from '@schema-engine/forms/state-container';
import { useFormStateContext } from './context';
import type { FormValues } from './types';

type Target = string | readonly string[] | undefined;

const isPath = (item: unknown): item is string => typeof item === 'string';

/** The target a key stands for: the key is what keeps a store alive while a caller passes a new list of the same paths. */
function parseTarget(key: string): Target {
	const parsed: unknown = JSON.parse(key);
	if (isPath(parsed)) return parsed;
	return Array.isArray(parsed) && parsed.every(isPath) ? parsed : undefined;
}

/**
 * The store of one `useWatch` call: what is watched, as the same object while it did not change.
 *
 * @remarks
 * Kept per call, so two components never share or overwrite a list, and a render never builds a new one for
 * unchanged values, which `useSyncExternalStore` would take for a change.
 */
function createWatchStore(container: FormStateContainer, target: Target) {
	let last: readonly unknown[] = [];
	const read = (snapshot: FormStateSnapshot): unknown => {
		if (target === undefined) return snapshot.values;
		if (isPath(target)) return selectValue(snapshot, target);
		const next = target.map((path) => selectValue(snapshot, path));
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

/**
 * Watches the form's values and re-renders when what it watches changes.
 *
 * @remarks
 * With no argument it is the whole value tree, the same object while no value changed. With a path it is the
 * value there, `unknown` as the container holds it, which the caller narrows. With a list it is the values at
 * those paths, in the order given, the same array while none changed.
 */
export function useWatch(): FormValues;
export function useWatch(path: string): unknown;
export function useWatch(paths: readonly string[]): readonly unknown[];
export function useWatch(target?: string | readonly string[]): unknown {
	const { container } = useFormStateContext();
	const key = JSON.stringify(target ?? null);
	const store = useMemo(() => createWatchStore(container, parseTarget(key)), [container, key]);
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
