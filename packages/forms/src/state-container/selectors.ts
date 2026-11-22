import { getValueAtPath } from '@/lib/path-values';
import type { FormStateError, FormStateSnapshot, FormStateWarning } from './types';

/** What is known about one field, after `getFieldState` of React Hook Form. */
export interface FormFieldState {
	/** The error reported for exactly this path, never one inherited from a container around it. */
	readonly error: FormStateError | undefined;
	/** The non-blocking advice for exactly this path. */
	readonly warning: FormStateWarning | undefined;
	/** Whether the path has an error. A warning does not make a field invalid. */
	readonly invalid: boolean;
	/** Whether the path, a path around it or a path below it has been blurred. */
	readonly isTouched: boolean;
	/** Whether the path or a path below it differs from the defaults. */
	readonly isDirty: boolean;
	/** Whether the latest check that asked for exactly this path is still running. */
	readonly isValidating: boolean;
}

const isAround = (mark: string, path: string): boolean => path === mark || path.startsWith(`${mark}.`);
const isBelow = (mark: string, path: string): boolean => mark.startsWith(`${path}.`);

/** Stands for "no error" and "no warning" as a key of the intern tables: it is never handed out. */
const NO_ERROR: object = Object.freeze({});
const NO_WARNING: object = Object.freeze({});
const statesByIssues = new WeakMap<object, WeakMap<object, FormFieldState[]>>();

/**
 * The one field state for an error, a warning and three flags.
 *
 * @remarks Interned, so a field that did not change has the same object in every snapshot.
 */
function internFieldState(
	error: FormStateError | undefined,
	warning: FormStateWarning | undefined,
	isTouched: boolean,
	isDirty: boolean,
	isValidating: boolean,
): FormFieldState {
	const errorKey = error ?? NO_ERROR;
	let byWarning = statesByIssues.get(errorKey);
	if (!byWarning) statesByIssues.set(errorKey, (byWarning = new WeakMap()));
	const warningKey = warning ?? NO_WARNING;
	let states = byWarning.get(warningKey);
	if (!states) byWarning.set(warningKey, (states = []));
	const index = (isTouched ? 1 : 0) + (isDirty ? 2 : 0) + (isValidating ? 4 : 0);
	return (states[index] ??= Object.freeze({
		error,
		warning,
		invalid: error !== undefined,
		isTouched,
		isDirty,
		isValidating,
	}));
}

const fieldStates = new WeakMap<FormStateSnapshot, Map<string, FormFieldState>>();

/**
 * The state of one field in a snapshot.
 *
 * @remarks
 * Pure and memoized: the same object comes back for the same snapshot and path, and for a later snapshot
 * while the field's error, warning and flags are unchanged, so it is safe as a selector for
 * `useSyncExternalStore` or an external store source.
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
			selectWarning(snapshot, path),
			touched.some((mark) => isAround(mark, path) || isBelow(mark, path)),
			dirty.some((mark) => mark === path || isBelow(mark, path)),
			Object.hasOwn(snapshot.validating, path),
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

/** The advice reported for exactly `path`, never one inherited from a container around it. */
export function selectWarning(snapshot: FormStateSnapshot, path: string): FormStateWarning | undefined {
	return Object.hasOwn(snapshot.warnings, path) ? snapshot.warnings[path] : undefined;
}

const NO_ERRORS: Readonly<Record<string, FormStateError>> = Object.freeze({});

interface SelectionNode {
	result?: Readonly<Record<string, FormStateError>>;
	readonly next: Map<string, WeakMap<FormStateError, SelectionNode>>;
}
const selections: SelectionNode = { next: new Map() };
const underByErrors = new WeakMap<object, Map<string, Readonly<Record<string, FormStateError>>>>();

/** The one selection for these errors, found by walking path and error object, so an equal list is the same object. */
function internSelection(
	found: ReadonlyArray<readonly [string, FormStateError]>,
): Readonly<Record<string, FormStateError>> {
	let node = selections;
	for (const [key, error] of found) {
		let byError = node.next.get(key);
		if (!byError) node.next.set(key, (byError = new WeakMap()));
		let child = byError.get(error);
		if (!child) byError.set(error, (child = { next: new Map() }));
		node = child;
	}
	return (node.result ??= Object.freeze(Object.fromEntries(found)));
}

/**
 * The errors at `path` and below it, by path: what to ask of a row or a section to know whether it has any.
 *
 * @remarks
 * Interned by the errors it lists, so the same object comes back, across snapshots, until an error at or
 * below `path` changes, however much else does.
 */
export function selectErrorsUnder(snapshot: FormStateSnapshot, path: string): Readonly<Record<string, FormStateError>> {
	let byPath = underByErrors.get(snapshot.errors);
	if (!byPath) underByErrors.set(snapshot.errors, (byPath = new Map()));
	let under = byPath.get(path);
	if (!under) {
		const found = Object.entries(snapshot.errors).filter(([key]) => key === path || key.startsWith(`${path}.`));
		under = found.length === 0 ? NO_ERRORS : internSelection(found);
		byPath.set(path, under);
	}
	return under;
}
