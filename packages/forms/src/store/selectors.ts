import { getValueAtPath } from '@/lib/path-values';
import type { FormStateError, FormStateSnapshot } from './types';

/** What is known about one field, after `getFieldState` of React Hook Form. */
export interface FormFieldState {
	/** The error reported for exactly this path, never one inherited from a container around it. */
	readonly error: FormStateError | undefined;
	readonly invalid: boolean;
	/** Whether the path, a path around it or a path below it has been blurred. */
	readonly isTouched: boolean;
	/** Whether the path or a path below it differs from the defaults. */
	readonly isDirty: boolean;
}

const fieldStates = new WeakMap<FormStateSnapshot, Map<string, FormFieldState>>();

const isAround = (mark: string, path: string): boolean => mark === '' || path === mark || path.startsWith(`${mark}.`);
const isBelow = (mark: string, path: string): boolean => path === '' || mark.startsWith(`${path}.`);

/**
 * The state of one field in a snapshot.
 *
 * @remarks
 * Pure and memoized per snapshot and path: the same object comes back for the same arguments, so it is
 * safe as a selector for `useSyncExternalStore` or an external store source.
 */
export function selectFieldState(snapshot: FormStateSnapshot, path: string): FormFieldState {
	let states = fieldStates.get(snapshot);
	if (!states) fieldStates.set(snapshot, (states = new Map()));
	let state = states.get(path);
	if (!state) {
		const error = selectError(snapshot, path);
		const touched = Object.keys(snapshot.touched);
		const dirty = Object.keys(snapshot.dirty);
		state = {
			error,
			invalid: error !== undefined,
			isTouched: touched.some((mark) => isAround(mark, path) || isBelow(mark, path)),
			isDirty: dirty.some((mark) => mark === path || isBelow(mark, path)),
		};
		states.set(path, state);
	}
	return state;
}

/** The value at a dotted path of a snapshot; the same value, so the same reference, while that branch is unchanged. */
export function selectValue(snapshot: FormStateSnapshot, path: string): unknown {
	return getValueAtPath(snapshot.values, path);
}

/** The error reported for exactly `path`, never one inherited from a container around it. */
export function selectError(snapshot: FormStateSnapshot, path: string): FormStateError | undefined {
	return Object.hasOwn(snapshot.errors, path) ? snapshot.errors[path] : undefined;
}
