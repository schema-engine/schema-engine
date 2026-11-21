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

const isAround = (mark: string, path: string): boolean => path === mark || path.startsWith(`${mark}.`);
const isBelow = (mark: string, path: string): boolean => mark.startsWith(`${path}.`);

const flagIndex = (isTouched: boolean, isDirty: boolean): number => (isTouched ? 1 : 0) + (isDirty ? 2 : 0);
const stateWithout = (index: number): FormFieldState =>
	Object.freeze({ error: undefined, invalid: false, isTouched: (index & 1) === 1, isDirty: (index & 2) === 2 });
const NO_ERROR_STATES = [0, 1, 2, 3].map(stateWithout);
const stateByError = new WeakMap<FormStateError, FormFieldState[]>();

/**
 * The one field state for an error and two flags.
 *
 * @remarks Interned, so a field that did not change has the same object in every snapshot.
 */
function internFieldState(error: FormStateError | undefined, isTouched: boolean, isDirty: boolean): FormFieldState {
	const index = flagIndex(isTouched, isDirty);
	if (!error) return NO_ERROR_STATES[index];
	let states = stateByError.get(error);
	if (!states) stateByError.set(error, (states = []));
	return (states[index] ??= Object.freeze({ error, invalid: true, isTouched, isDirty }));
}

const fieldStates = new WeakMap<FormStateSnapshot, Map<string, FormFieldState>>();

/**
 * The state of one field in a snapshot.
 *
 * @remarks
 * Pure and memoized: the same object comes back for the same snapshot and path, and for a later snapshot
 * while the field's error and flags are unchanged, so it is safe as a selector for `useSyncExternalStore`
 * or an external store source.
 */
export function selectFieldState(snapshot: FormStateSnapshot, path: string): FormFieldState {
	let states = fieldStates.get(snapshot);
	if (!states) fieldStates.set(snapshot, (states = new Map()));
	let state = states.get(path);
	if (!state) {
		const touched = Object.keys(snapshot.touched);
		const dirty = Object.keys(snapshot.dirty);
		state = internFieldState(
			selectError(snapshot, path),
			touched.some((mark) => isAround(mark, path) || isBelow(mark, path)),
			dirty.some((mark) => mark === path || isBelow(mark, path)),
		);
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

const NO_ERRORS: Readonly<Record<string, FormStateError>> = Object.freeze({});
const underByErrors = new WeakMap<object, Map<string, Readonly<Record<string, FormStateError>>>>();

/**
 * The errors at `path` and below it, by path: what to ask of a row or a section to know whether it has any.
 *
 * @remarks
 * Memoized by the snapshot's `errors`, which keeps its reference while no error changes, so the same object
 * comes back across snapshots until an error at or below `path` does.
 */
export function selectErrorsUnder(snapshot: FormStateSnapshot, path: string): Readonly<Record<string, FormStateError>> {
	let byPath = underByErrors.get(snapshot.errors);
	if (!byPath) underByErrors.set(snapshot.errors, (byPath = new Map()));
	let under = byPath.get(path);
	if (!under) {
		const found = Object.entries(snapshot.errors).filter(([key]) => key === path || key.startsWith(`${path}.`));
		under = found.length === 0 ? NO_ERRORS : Object.freeze(Object.fromEntries(found));
		byPath.set(path, under);
	}
	return under;
}
