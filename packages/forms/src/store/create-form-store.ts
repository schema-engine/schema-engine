import type { FieldArrayValue } from '@/adapters/types';
import { validateFormValues } from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { getValueAtPath } from '@/lib/path-values';
import {
	buildDependencyIndex,
	shouldSurfaceDependentError,
	type DependencyIndex,
} from '@/schemas/validation/dependencies';
import { flattenErrors, remapRows, syncRowIds } from './field-state';
import {
	VALIDATION_ERROR_SOURCE,
	type FormErrorSource,
	type FormStore,
	type FormStoreError,
	type FormStoreOptions,
	type FormStoreSnapshot,
} from './types';
import {
	collectDirty,
	createMap,
	isWithin,
	reconcile,
	setIn,
	stabilize,
	toInternal,
	toPlain,
	toPlainMap,
	type NullMap,
} from './value-tree';

type ErrorMap = NullMap<FormStoreError>;

/**
 * Everything the store holds. Replaced as a whole by every command; no part is mutated.
 *
 * @remarks
 * `epoch` counts the changes that make a running validation stale: a reset and a row move.
 */
interface State {
	readonly values: NullMap;
	readonly defaults: NullMap;
	/** Error maps by source, ordered from the least to the most recently set; `validation` is kept apart. */
	readonly sources: ReadonlyMap<FormErrorSource, ErrorMap>;
	readonly validation: ErrorMap;
	readonly touched: NullMap<true>;
	readonly dirty: NullMap<true>;
	readonly rowIds: NullMap<readonly string[]>;
	/** Paths whose validation failed, and so re-validate by `reValidateMode`; `''` is the whole form. */
	readonly failedScopes: readonly string[];
	readonly validating: number;
	readonly epoch: number;
}

interface RowEntry {
	/** Index the row had before the operation, or `undefined` for a row the operation adds. */
	readonly from?: number;
	readonly value: unknown;
	readonly id: string;
}

const NO_ERRORS: ErrorMap = createMap();

const readAt = (root: NullMap, path: string): unknown => getValueAtPath(root, path);
const isRow = (index: number, length: number): boolean => Number.isInteger(index) && index >= 0 && index < length;
const asRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

/**
 * Creates the engine's reference {@link FormStore}: dependency-free, with no framework.
 *
 * @remarks
 * Values live in null-prototype maps and come out of the snapshot as frozen plain records; both views
 * share structure, so a branch no command touched keeps its reference. Validation goes through
 * `validateFormValues` with one debounce scope for recorded validation. A silent
 * {@link FormStore.checkValidity} gets a scope of its own, so it never replaces a debounced call of
 * the validation that writes errors.
 */
export function createFormStore(options: FormStoreOptions): FormStore {
	const { elements, registry, validationMode = 'onSubmit', reValidateMode = 'onChange' } = options;
	const debounceScope = createDebounceScope();
	const silentDebounceScope = createDebounceScope();
	const listeners = new Set<() => void>();
	let rowCounter = 0;
	const adoptedIds = new Set<string>();
	const mintId = (): string => {
		let id = `row-${++rowCounter}`;
		while (adoptedIds.has(id)) id = `row-${++rowCounter}`;
		return id;
	};

	const initialDefaults = toInternal(options.defaultValues ?? {}) as NullMap;
	let state: State = {
		values: initialDefaults,
		defaults: initialDefaults,
		sources: new Map(),
		validation: NO_ERRORS,
		touched: createMap(),
		dirty: createMap(),
		rowIds: syncRowIds(createMap(), '', initialDefaults, mintId),
		failedScopes: [],
		validating: 0,
		epoch: 0,
	};

	let mergedFor: { sources: State['sources']; validation: ErrorMap; merged: ErrorMap } | undefined;
	function mergedErrors(current: State): ErrorMap {
		if (mergedFor?.sources === current.sources && mergedFor.validation === current.validation) {
			return mergedFor.merged;
		}
		const merged = createMap<FormStoreError>();
		Object.assign(merged, current.validation);
		for (const errors of current.sources.values()) Object.assign(merged, errors);
		const stable = mergedFor ? stabilize(mergedFor.merged, merged) : merged;
		mergedFor = { sources: current.sources, validation: current.validation, merged: stable };
		return stable;
	}

	let snapshot = toSnapshot(state);
	const serverSnapshot = snapshot;

	function toSnapshot(current: State): FormStoreSnapshot {
		return Object.freeze({
			values: toPlain(current.values) as FormStoreSnapshot['values'],
			errors: toPlainMap(mergedErrors(current)),
			touched: toPlainMap(current.touched),
			dirty: toPlainMap(current.dirty),
			rowIds: toPlainMap(current.rowIds),
			isValidating: current.validating > 0,
			checkFailed: current.failedScopes.length > 0,
		});
	}

	/** Applies one update atomically and notifies once, and only when something observable changed. */
	function commit(change: Partial<State>): void {
		const previous = state;
		let next: State = { ...previous, ...change };
		if (next.values !== previous.values || next.defaults !== previous.defaults) {
			const dirty = createMap<true>();
			collectDirty(next.values, next.defaults, '', dirty);
			next = { ...next, dirty: stabilize(previous.dirty, dirty) };
		}
		state = next;
		const nextSnapshot = toSnapshot(next);
		const changed = (Object.keys(nextSnapshot) as Array<keyof FormStoreSnapshot>).some(
			(key) => nextSnapshot[key] !== snapshot[key],
		);
		if (!changed) return;
		snapshot = nextSnapshot;
		for (const listener of listeners) listener();
	}

	const isFailed = (path: string): boolean => state.failedScopes.some((scope) => isWithin(path, scope));

	function validatesOn(event: 'change' | 'blur', path: string): boolean {
		const target = event === 'change' ? 'onChange' : 'onBlur';
		return isFailed(path) ? reValidateMode === target : validationMode === 'all' || validationMode === target;
	}

	/**
	 * Validates `names` against the values as they are now.
	 *
	 * @remarks
	 * A recorded result is applied only where it still describes the form: it is dropped after a reset
	 * or a row move, and per path when that path's value was written while the validation ran. A silent
	 * one writes nothing.
	 */
	async function runValidation(
		names: readonly string[] | undefined,
		mode: { record: boolean; markFailed: boolean },
	): Promise<boolean> {
		const startValues = state.values;
		const startEpoch = state.epoch;
		const scope = names?.length ? names : undefined;
		if (mode.record) commit({ validating: state.validating + 1 });
		let flat: ErrorMap;
		try {
			const nested = await validateFormValues({
				elements,
				registry,
				values: toPlain(startValues) as Record<string, unknown>,
				names: scope,
				debounceScope: mode.record ? debounceScope : silentDebounceScope,
			});
			flat = flattenErrors(nested);
		} catch (error) {
			if (mode.record) commit({ validating: state.validating - 1 });
			throw error;
		}
		const passed = Object.keys(flat).length === 0;
		if (!mode.record) return passed;

		if (state.epoch !== startEpoch) {
			commit({ validating: state.validating - 1 });
			return passed;
		}
		const unchanged = (path: string): boolean => Object.is(readAt(state.values, path), readAt(startValues, path));
		const inScope = (path: string): boolean => !scope || scope.some((name) => isWithin(path, name));
		const next = createMap<FormStoreError>();
		for (const path of Object.keys(state.validation)) {
			if (!inScope(path) || !unchanged(path)) next[path] = state.validation[path];
		}
		for (const path of Object.keys(flat)) {
			if (unchanged(path)) next[path] = flat[path];
		}
		const failedScopes =
			mode.markFailed && !passed ? [...new Set([...state.failedScopes, ...(scope ?? [''])])] : state.failedScopes;
		commit({
			validation: stabilize(state.validation, next),
			failedScopes: failedScopes.length === state.failedScopes.length ? state.failedScopes : failedScopes,
			validating: state.validating - 1,
		});
		return passed;
	}

	let cachedIndex: { rowIds: State['rowIds']; shape: string; index: DependencyIndex } | undefined;

	/**
	 * The dependency index for the form's current rows.
	 *
	 * @remarks
	 * The index depends on the elements, which never change, and on how many rows each array has, so it
	 * is rebuilt only when that row count signature changes. Writing a value, moving rows or adopting
	 * ids leaves it as it was; the signature is not even computed while `rowIds` is the same object.
	 */
	function dependencyIndex(): DependencyIndex {
		if (cachedIndex?.rowIds === state.rowIds) return cachedIndex.index;
		const shape = Object.keys(state.rowIds)
			.map((path) => `${path}:${state.rowIds[path].length}`)
			.toSorted()
			.join('|');
		if (cachedIndex?.shape === shape) {
			cachedIndex = { ...cachedIndex, rowIds: state.rowIds };
			return cachedIndex.index;
		}
		const index = buildDependencyIndex(elements, toPlain(state.values) as Record<string, unknown>, registry);
		cachedIndex = { rowIds: state.rowIds, shape, index };
		return index;
	}

	/** Names that must be validated after a change: the dependents of every watched path whose value moved. */
	function dependentsOfChange(previousValues: NullMap): string[] {
		const index = dependencyIndex();
		const changed = index.watched.filter(
			(path) => !Object.is(readAt(previousValues, path), readAt(state.values, path)),
		);
		return index
			.expand(changed)
			.filter((path) =>
				shouldSurfaceDependentError({ touched: Object.hasOwn(state.touched, path), submitted: isFailed(path) }),
			);
	}

	/**
	 * Validates what a change calls for, without waiting for it.
	 *
	 * @remarks
	 * A rejection is dropped: `validateFormValues` turns a failing rule into an error message, so what
	 * can still reject is a bug in the validation itself, and the next explicit `validate` surfaces it.
	 */
	function afterChange(previousValues: NullMap, changedPath: string | undefined): void {
		const names = new Set(dependentsOfChange(previousValues));
		if (changedPath !== undefined && validatesOn('change', changedPath)) names.add(changedPath);
		if (names.size > 0) void runValidation([...names], { record: true, markFailed: false }).catch(() => undefined);
	}

	function dropStaleErrors(sources: State['sources'], path: string): State['sources'] {
		let next: Map<FormErrorSource, ErrorMap> | undefined;
		for (const [source, errors] of sources) {
			const kept = createMap<FormStoreError>();
			for (const key of Object.keys(errors)) if (!isWithin(key, path)) kept[key] = errors[key];
			if (Object.keys(kept).length !== Object.keys(errors).length) {
				next ??= new Map(sources);
				if (Object.keys(kept).length === 0) next.delete(source);
				else next.set(source, kept);
			}
		}
		return next ?? sources;
	}

	function setValue(path: string, value: unknown): void {
		const previousValues = state.values;
		const branch = reconcile(readAt(previousValues, path), toInternal(value));
		const values = setIn(previousValues, path, branch);
		if (values === previousValues) return;
		commit({
			values,
			rowIds: syncRowIds(state.rowIds, path, readAt(values, path), mintId),
			sources: path ? dropStaleErrors(state.sources, path) : new Map(),
		});
		afterChange(previousValues, path);
	}

	function rowsAt(path: string): RowEntry[] {
		const value = readAt(state.values, path);
		const rows = Array.isArray(value) ? value : [];
		const ids = state.rowIds[path] ?? [];
		return rows.map((row, index) => ({ from: index, value: row, id: ids[index] ?? mintId() }));
	}

	/** Writes the rows an operation produced, and moves every piece of row state with them in one commit. */
	function commitRows(path: string, rows: readonly RowEntry[]): void {
		const previousValues = state.values;
		const target = new Map<number, number>();
		rows.forEach((row, index) => {
			if (row.from !== undefined) target.set(row.from, index);
		});
		const values = setIn(
			previousValues,
			path,
			reconcile(
				readAt(previousValues, path),
				rows.map((row) => row.value),
			),
		);
		const remap = <T>(map: NullMap<T>): NullMap<T> => remapRows(map, path, (oldIndex) => target.get(oldIndex));
		const nextIds = Object.freeze(rows.map((row) => row.id));
		const previousIds = state.rowIds[path] ?? [];
		const idsChanged =
			nextIds.length !== previousIds.length || nextIds.some((id, index) => id !== previousIds[index]);
		const sources = new Map<FormErrorSource, ErrorMap>();
		for (const [source, errors] of state.sources) sources.set(source, remap(errors));
		const rowIds = remap(state.rowIds) as NullMap<readonly string[]>;
		commit({
			values,
			validation: remap(state.validation),
			sources,
			touched: remap(state.touched),
			rowIds: syncRowIds(
				{ ...rowIds, [path]: nextIds } as NullMap<readonly string[]>,
				path,
				readAt(values, path),
				mintId,
			),
			epoch: values !== previousValues || idsChanged ? state.epoch + 1 : state.epoch,
		});
		afterChange(previousValues, undefined);
	}

	const fresh = (value: unknown): RowEntry => ({ value: toInternal(value), id: mintId() });

	function fieldArray(path: string): FieldArrayValue {
		const insert = (index: number, value: unknown): void => {
			const rows = rowsAt(path);
			const added = asRows(value);
			if (!Number.isInteger(index) || index < 0 || index > rows.length || added.length === 0) return;
			rows.splice(index, 0, ...added.map(fresh));
			commitRows(path, rows);
		};
		const rearrange = (indexes: number[], change: (rows: RowEntry[]) => RowEntry[]): void => {
			const rows = rowsAt(path);
			if (!indexes.every((index) => isRow(index, rows.length))) return;
			commitRows(path, change(rows));
		};
		return {
			get fields() {
				return (state.rowIds[path] ?? []).map((id) => ({ id }));
			},
			append: (value) => insert(rowsAt(path).length, value),
			prepend: (value) => insert(0, value),
			insert,
			swap: (indexA, indexB) =>
				rearrange([indexA, indexB], (rows) => {
					[rows[indexA], rows[indexB]] = [rows[indexB], rows[indexA]];
					return rows;
				}),
			move: (indexA, indexB) =>
				rearrange([indexA, indexB], (rows) => {
					rows.splice(indexB, 0, ...rows.splice(indexA, 1));
					return rows;
				}),
			update: (index, value) =>
				rearrange([index], (rows) => {
					rows[index] = fresh(value);
					return rows;
				}),
			replace: (values) => commitRows(path, values.map(fresh)),
			remove: (index) => {
				const rows = rowsAt(path);
				if (index === undefined) return rows.length > 0 ? commitRows(path, []) : undefined;
				const removed = new Set((Array.isArray(index) ? index : [index]).filter((i) => isRow(i, rows.length)));
				if (removed.size > 0)
					commitRows(
						path,
						rows.filter((_, position) => !removed.has(position)),
					);
			},
		};
	}

	return {
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getSnapshot: () => snapshot,
		getServerSnapshot: () => serverSnapshot,
		getValue: (path) => toPlain(readAt(state.values, path)),
		setValue,
		blur(path) {
			if (!Object.hasOwn(state.touched, path)) {
				const touched = createMap<true>();
				Object.assign(touched, state.touched);
				touched[path] = true;
				commit({ touched });
			}
			if (validatesOn('blur', path))
				void runValidation([path], { record: true, markFailed: false }).catch(() => undefined);
		},
		reset(values) {
			const defaults = values ? (toInternal(values) as NullMap) : state.defaults;
			commit({
				values: defaults,
				defaults,
				sources: new Map(),
				validation: NO_ERRORS,
				touched: createMap(),
				rowIds: syncRowIds(createMap(), '', defaults, mintId),
				failedScopes: [],
				epoch: state.epoch + 1,
			});
		},
		validate: (paths) => runValidation(paths, { record: true, markFailed: true }),
		checkValidity: (paths) => runValidation(paths, { record: false, markFailed: false }),
		setErrors(source, errors) {
			if (source === VALIDATION_ERROR_SOURCE) {
				throw new Error(`The '${VALIDATION_ERROR_SOURCE}' error source belongs to the store`);
			}
			const sources = new Map(state.sources);
			sources.delete(source);
			const entries = Object.entries(errors);
			if (entries.length > 0) {
				const map = createMap<FormStoreError>();
				for (const [path, error] of entries)
					map[path] = Object.freeze({ type: error.type, message: error.message });
				sources.set(source, map);
			}
			commit({ sources });
		},
		fieldArray,
		adoptRowIds(path, ids) {
			const current = state.rowIds[path];
			if (!current || current.length !== ids.length || new Set(ids).size !== ids.length) return;
			if (current.every((id, index) => id === ids[index])) return;
			for (const id of ids) adoptedIds.add(id);
			commit({ rowIds: { ...state.rowIds, [path]: Object.freeze([...ids]) } as NullMap<readonly string[]> });
		},
	};
}
