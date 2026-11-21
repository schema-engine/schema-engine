import type { FieldArrayValue } from '@/adapters/types';
import { validateFormValues } from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { getValueAtPath } from '@/lib/path-values';
import {
	buildDependencyIndex,
	shouldSurfaceDependentError,
	type DependencyIndex,
} from '@/schemas/validation/dependencies';
import { flattenErrors } from './field-state';
import { anchorOf, flatIds, idsAt, replaceIdsAt, resolveAnchor, syncIds, type IdTree, type RowNode } from './row-ids';
import { createRunTracker } from './stale-results';
import {
	conformAt,
	coveredAt,
	fromEntries,
	getAt,
	leafAt,
	leaves,
	markAt,
	mergeTrees,
	reorderAt,
	setAt,
	stable,
	type Tree,
} from './state-tree';
import {
	VALIDATION_ERROR_SOURCE,
	type FormErrorSource,
	type FormFieldState,
	type FormStateRoot,
	type FormStore,
	type FormStoreError,
	type FormStoreOptions,
	type FormStoreSnapshot,
} from './types';
import {
	changedPaths,
	createMap,
	dirtyTree,
	isWithin,
	reconcile,
	setIn,
	stabilize,
	toInternal,
	toPlain,
	toPlainMap,
	type NullMap,
} from './value-tree';

/**
 * Everything the store holds. Replaced as a whole by every command; no part is mutated.
 *
 * @remarks
 * Field state is held in the shape of the values (see `state-tree.ts`), so a row's state is the row's
 * element of each array and moves with it. `failed` is `true` for the whole form, or a tree of the
 * paths whose check failed.
 */
interface State {
	readonly values: NullMap;
	readonly defaults: NullMap;
	/** The store's own errors. */
	readonly validation: Tree;
	/** Error trees by source, ordered from the least to the most recently set. */
	readonly sources: ReadonlyMap<FormErrorSource, Tree>;
	readonly touched: Tree;
	readonly dirty: Tree;
	readonly failed: Tree;
	readonly ids: IdTree | undefined;
	readonly validating: number;
}

/** A row while an operation rebuilds an array: where it was, and what it is now. */
interface RowEntry {
	readonly from?: number;
	readonly value: unknown;
	readonly node: RowNode;
}

const isStructural = (value: unknown): boolean => value !== null && typeof value === 'object';
/** The leaves of an error tree as the snapshot shows them, the very objects its `errorTree` holds. */
function shownLeaves(tree: Tree): NullMap<FormStoreError> {
	const shown = createMap<FormStoreError>();
	for (const [path, leaf] of Object.entries(leaves(tree))) shown[path] = toPlain(leaf) as FormStoreError;
	return shown;
}

const EMPTY_VIEW = Object.freeze({});
const readAt = (root: NullMap, path: string): unknown => getValueAtPath(root, path);
const isRow = (index: number, length: number): boolean => Number.isInteger(index) && index >= 0 && index < length;
const asRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);
const view = <T>(tree: Tree): FormStateRoot<T> =>
	tree === undefined ? EMPTY_VIEW : (toPlain(tree) as FormStateRoot<T>);

/**
 * Creates the engine's reference {@link FormStore}: framework-free, with the engine's validation.
 *
 * @remarks
 * Values live in null-prototype maps and come out of the snapshot as frozen plain records; both views
 * share structure, so a branch no command touched keeps its reference. Validation goes through
 * `validateFormValues` with one debounce scope for recorded validation. A silent
 * {@link FormStore.checkValidity} gets a scope of its own, so it never replaces a debounced call of
 * the validation that writes errors.
 *
 * Errors, touched marks and failed checks are trees in the shape of the values. A row operation is one
 * splice, applied to the values and to every tree in the same commit, so state cannot fall out of step
 * with its rows. A validation result that arrives late finds its fields by row id, not by index.
 */
export function createFormStore(options: FormStoreOptions): FormStore {
	const { elements, registry, validationMode = 'onSubmit', reValidateMode = 'onChange' } = options;
	const tracker = createRunTracker();
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
		validation: undefined,
		sources: new Map(),
		touched: undefined,
		dirty: undefined,
		failed: undefined,
		ids: syncIds(undefined, initialDefaults, mintId),
		validating: 0,
	};

	let effectiveFor:
		{ validation: Tree; sources: State['sources']; tree: Tree; flat: NullMap<FormStoreError> } | undefined;
	/** The errors to show, from every source: the store's own lowest, then each source by recency. */
	function effectiveErrors(current: State): { tree: Tree; flat: NullMap<FormStoreError> } {
		if (
			effectiveFor &&
			effectiveFor.validation === current.validation &&
			effectiveFor.sources === current.sources
		) {
			return effectiveFor;
		}
		const tree = stable(effectiveFor?.tree, mergeTrees([current.validation, ...current.sources.values()]));
		const flat = stabilize(effectiveFor?.flat ?? createMap<FormStoreError>(), shownLeaves(tree));
		const computed = { validation: current.validation, sources: current.sources, tree, flat };
		effectiveFor = computed;
		return computed;
	}

	let flatIdsFor: { ids: IdTree | undefined; flat: NullMap<readonly string[]> } | undefined;
	function flatRowIds(current: State): NullMap<readonly string[]> {
		if (flatIdsFor && flatIdsFor.ids === current.ids) return flatIdsFor.flat;
		const flat = stabilize(flatIdsFor?.flat ?? createMap<readonly string[]>(), flatIds(current.ids));
		flatIdsFor = { ids: current.ids, flat };
		return flat;
	}

	let snapshot = toSnapshot(state);
	const serverSnapshot = snapshot;

	function toSnapshot(current: State): FormStoreSnapshot {
		const errors = effectiveErrors(current);
		return Object.freeze({
			values: toPlain(current.values) as FormStoreSnapshot['values'],
			errors: toPlainMap(errors.flat),
			errorTree: view<FormStoreError>(errors.tree),
			touched: view<true>(current.touched),
			dirty: view<true>(current.dirty),
			rowIds: toPlainMap(flatRowIds(current)),
			isValidating: current.validating > 0,
			checkFailed: current.failed !== undefined,
		});
	}

	let batchDepth = 0;
	let notifyAfterBatch = false;

	function notify(): void {
		for (const listener of listeners) listener();
	}

	/**
	 * Runs one command's synchronous work, so every commit in it reaches subscribers as one notification.
	 *
	 * @remarks
	 * A command that starts a validation commits `isValidating` before the validation's first await; the
	 * batch folds that into the command's own update.
	 */
	function batch<T>(work: () => T): T {
		batchDepth += 1;
		try {
			return work();
		} finally {
			batchDepth -= 1;
			if (batchDepth === 0 && notifyAfterBatch) {
				notifyAfterBatch = false;
				notify();
			}
		}
	}

	/** Applies one update atomically and notifies, only when something observable changed. */
	function commit(change: Partial<State>): void {
		const previous = state;
		let next: State = { ...previous, ...change };
		if (next.values !== previous.values || next.defaults !== previous.defaults) {
			next = { ...next, dirty: stable(previous.dirty, dirtyTree(next.values, next.defaults)) };
		}
		state = next;
		const nextSnapshot = toSnapshot(next);
		const changed = (Object.keys(nextSnapshot) as Array<keyof FormStoreSnapshot>).some(
			(key) => nextSnapshot[key] !== snapshot[key],
		);
		if (!changed) return;
		snapshot = nextSnapshot;
		if (batchDepth > 0) notifyAfterBatch = true;
		else notify();
	}

	const isFailed = (path: string): boolean => coveredAt(state.failed, path);
	const isTouched = (path: string): boolean => coveredAt(state.touched, path);

	function validatesOn(event: 'change' | 'blur', path: string): boolean {
		const target = event === 'change' ? 'onChange' : 'onBlur';
		return isFailed(path) ? reValidateMode === target : validationMode === 'all' || validationMode === target;
	}

	interface ValidationMode {
		/** Writes the result, and tracks it against later requests; a silent check does neither. */
		readonly record: boolean;
		/** Starts re-validation by `reValidateMode` for the paths when they fail. */
		readonly markFailed: boolean;
		/** Match `names` as exact paths, not as prefixes. */
		readonly exact?: boolean;
		/** Run once more against the current state when part of the result is stale. */
		readonly retry?: boolean;
	}

	/**
	 * Validates `names` (the whole form when omitted; nothing when empty) against the values as they are now.
	 *
	 * @remarks
	 * A recorded result is applied path by path, at the place its fields have now: each path is found
	 * again through the ids of the rows it ran through, so a result for a row that moved lands on that
	 * row, and one for a row that is gone is dropped. It is also dropped for a path when that path's value
	 * was written while it ran, a value a rule of the path reads changed, a validation that started later
	 * asked for the path, or the form was reset. When part of a result is dropped, an explicit validation
	 * runs once more and resolves with the validity of the current state; a silent check writes nothing.
	 */
	async function runValidation(names: readonly string[] | undefined, mode: ValidationMode): Promise<boolean> {
		if (names?.length === 0) return true;
		const startValues = state.values;
		const startIds = state.ids;
		const startValidation = state.validation;
		const startIndex = mode.record ? dependencyIndex() : undefined;
		const run = mode.record ? tracker.start(names, mode.exact === true) : undefined;
		if (mode.record) commit({ validating: state.validating + 1 });
		const settleRun = (): void => {
			if (!run) return;
			tracker.finish(run);
			commit({ validating: state.validating - 1 });
		};
		let flat: NullMap<FormStoreError>;
		try {
			const nested = await validateFormValues({
				elements,
				registry,
				values: toPlain(startValues) as Record<string, unknown>,
				names,
				debounceScope: mode.record ? debounceScope : silentDebounceScope,
			});
			flat = flattenErrors(nested);
		} catch (error) {
			settleRun();
			throw error;
		}
		const inScope = (path: string): boolean =>
			!names || (mode.exact ? names.includes(path) : names.some((name) => isWithin(path, name)));
		for (const path of Object.keys(flat)) if (!inScope(path)) delete flat[path];
		const passed = Object.keys(flat).length === 0;
		if (!run || !startIndex) return passed;

		const now = (path: string): string | undefined => resolveAnchor(anchorOf(startIds, path), state.ids);
		const movedSince = (path: string): boolean => {
			const current = now(path);
			return current === undefined || !Object.is(readAt(state.values, current), readAt(startValues, path));
		};
		const dependencyChanged = (path: string): boolean =>
			startIndex.watched.some(
				(watched) => startIndex.dependentsOf(watched).includes(path) && movedSince(watched),
			);
		const lostContainer = (path: string): boolean =>
			path
				.split('.')
				.slice(0, -1)
				.some((_, depth, segments) => {
					const above = segments.slice(0, depth + 1).join('.');
					const current = now(above);
					return (
						current === undefined ||
						(isStructural(readAt(startValues, above)) && !isStructural(readAt(state.values, current)))
					);
				});
		const stale = (path: string, current: string | undefined): boolean =>
			current === undefined ||
			lostContainer(path) ||
			movedSince(path) ||
			tracker.superseded(run, current) ||
			dependencyChanged(path);
		const decided = [
			...new Set([...Object.keys(leaves(startValidation)).filter(inScope), ...Object.keys(flat)]),
		].map((path) => ({ path, current: now(path) }));
		const scopeStale = (): boolean =>
			changedPaths(startValues, state.values).some(
				(changed) => !names || names.some((name) => isWithin(changed, name) || isWithin(name, changed)),
			) ||
			startIndex.watched.some((watched) => movedSince(watched) && startIndex.dependentsOf(watched).some(inScope));
		if (mode.retry && (scopeStale() || decided.some(({ path, current }) => stale(path, current)))) {
			return batch(() => {
				settleRun();
				return runValidation(names, { ...mode, retry: false });
			});
		}

		let validation = state.validation;
		for (const { path, current } of decided.toSorted(
			(a, b) => b.path.split('.').length - a.path.split('.').length,
		)) {
			if (current !== undefined && !stale(path, current)) validation = setAt(validation, current, flat[path]);
		}
		let failed = state.failed;
		if (mode.markFailed && !passed) {
			failed = names
				? names.reduce<Tree>((tree, name) => {
						const current = now(name);
						return current === undefined ? tree : markAt(tree, current);
					}, failed)
				: true;
		}
		tracker.finish(run);
		commit({ validation, failed, validating: state.validating - 1 });
		const scopeNow = names?.flatMap((name) => now(name) ?? []);
		const stillInScope = (path: string): boolean =>
			!scopeNow || (mode.exact ? scopeNow.includes(path) : scopeNow.some((name) => isWithin(path, name)));
		return passed && !Object.keys(effectiveErrors(state).flat).some(stillInScope);
	}

	let cachedIndex: { ids: State['ids']; shape: string; index: DependencyIndex } | undefined;

	/**
	 * The dependency index for the form's current rows.
	 *
	 * @remarks
	 * The index depends on the elements, which never change, and on how many rows each array has, so it
	 * is rebuilt only when that row count signature changes. Writing a value, moving rows or adopting
	 * ids leaves it as it was; the signature is not even computed while the row ids are the same tree.
	 */
	function dependencyIndex(): DependencyIndex {
		if (cachedIndex && cachedIndex.ids === state.ids) return cachedIndex.index;
		const lengths = flatRowIds(state);
		const shape = Object.keys(lengths)
			.map((path) => `${path}:${lengths[path].length}`)
			.toSorted()
			.join('|');
		if (cachedIndex?.shape === shape) {
			cachedIndex = { ...cachedIndex, ids: state.ids };
			return cachedIndex.index;
		}
		const index = buildDependencyIndex(elements, toPlain(state.values) as Record<string, unknown>, registry);
		cachedIndex = { ids: state.ids, shape, index };
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
			.filter((path) => shouldSurfaceDependentError({ touched: isTouched(path), submitted: isFailed(path) }));
	}

	/**
	 * Validates what a change calls for, without waiting for it.
	 *
	 * @remarks
	 * The changed path is validated with its descendants, or alone when `exact`: a row operation
	 * validates the array's own rules and leaves the rows, which the user has not reached, to their dependents.
	 * A rejection is dropped: `validateFormValues` turns a failing rule into an error message, so what
	 * can still reject is a bug in the validation itself, and the next explicit `validate` surfaces it.
	 */
	function afterChange(previousValues: NullMap, changedPath: string, exact: boolean): void {
		const names = new Set(dependentsOfChange(previousValues));
		const validatesSelf = validatesOn('change', changedPath);
		if (validatesSelf && !exact) names.add(changedPath);
		const quiet = { record: true, markFailed: false } as const;
		if (names.size > 0) void runValidation([...names], quiet).catch(() => undefined);
		if (validatesSelf && exact) void runValidation([changedPath], { ...quiet, exact }).catch(() => undefined);
	}

	function setValue(path: string, value: unknown): void {
		const previousValues = state.values;
		const branch = reconcile(readAt(previousValues, path), toInternal(value));
		const values = setIn(previousValues, path, branch);
		if (values === previousValues) return;
		const root = path.split('.')[0];
		const idsRoot = syncIds(idsAt(state.ids, root), readAt(values, root), mintId);
		batch(() => {
			let sources = state.sources;
			if (!path) sources = new Map();
			else {
				const kept = new Map<FormErrorSource, Tree>();
				for (const [source, tree] of state.sources) {
					const cleared = setAt(tree, path, undefined);
					if (cleared !== undefined) kept.set(source, cleared);
				}
				sources = kept;
			}
			commit({
				values,
				ids: replaceIdsAt(state.ids, root, idsRoot),
				sources,
				validation: conformAt(state.validation, path, branch),
				touched: conformAt(state.touched, path, branch),
				failed: state.failed === true ? true : conformAt(state.failed, path, branch),
			});
			afterChange(previousValues, path, false);
		});
	}

	/** The array at `path` as rows with their ids, minting an id for a row that has none. */
	function rowsAt(path: string): RowEntry[] {
		const value = readAt(state.values, path);
		const rows = Array.isArray(value) ? value : [];
		const nodes = idsAt(state.ids, path);
		return rows.map((row, index) => ({
			from: index,
			value: row,
			node: (Array.isArray(nodes) ? (nodes as readonly RowNode[])[index] : undefined) ?? {
				id: mintId(),
				below: syncIds(undefined, row, mintId),
			},
		}));
	}

	/**
	 * Writes the rows an operation produced: one splice, applied to the values and to every state tree.
	 *
	 * @remarks
	 * Each state tree has one element per row, so a row's errors, touched marks and failed check are
	 * carried by moving the element; a row the operation adds has none.
	 */
	function commitRows(path: string, rows: readonly RowEntry[]): void {
		const previousValues = state.values;
		const order = rows.map((row) => row.from);
		const values = setIn(
			previousValues,
			path,
			reconcile(
				readAt(previousValues, path),
				rows.map((row) => row.value),
			),
		);
		const sources = new Map<FormErrorSource, Tree>();
		for (const [source, tree] of state.sources) {
			const moved = reorderAt(tree, path, order);
			if (moved !== undefined) sources.set(source, moved);
		}
		const root = path.split('.')[0];
		const placed = replaceIdsAt(
			state.ids,
			path,
			rows.map((row) => row.node),
		);
		batch(() => {
			commit({
				values,
				ids: replaceIdsAt(placed, root, syncIds(idsAt(placed, root), readAt(values, root), mintId)),
				sources,
				validation: reorderAt(state.validation, path, order),
				touched: reorderAt(state.touched, path, order),
				failed: state.failed === true ? true : reorderAt(state.failed, path, order),
			});
			afterChange(previousValues, path, true);
		});
	}

	const fresh = (value: unknown): RowEntry => {
		const internal = toInternal(value);
		return { value: internal, node: { id: mintId(), below: syncIds(undefined, internal, mintId) } };
	};

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
				const nodes = idsAt(state.ids, path);
				return Array.isArray(nodes) ? (nodes as readonly RowNode[]).map(({ id }) => ({ id })) : [];
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
		subscribeTo(selector, listener, isEqual = Object.is) {
			let selected = selector(snapshot);
			return this.subscribe(() => {
				const next = selector(snapshot);
				if (isEqual(selected, next)) return;
				selected = next;
				listener(next);
			});
		},
		getSnapshot: () => snapshot,
		getServerSnapshot: () => serverSnapshot,
		getValue: (path) => toPlain(readAt(state.values, path)),
		getFieldState(path): FormFieldState {
			const error = leafAt(effectiveErrors(state).tree, path) as FormStoreError | undefined;
			const marked = (tree: Tree): boolean => coveredAt(tree, path) || getAt(tree, path) !== undefined;
			return {
				error,
				invalid: error !== undefined,
				isTouched: marked(state.touched),
				isDirty: marked(state.dirty),
			};
		},
		setValue,
		blur: (path) =>
			batch(() => {
				if (!isTouched(path)) commit({ touched: markAt(state.touched, path) });
				if (validatesOn('blur', path)) {
					void runValidation([path], { record: true, markFailed: false }).catch(() => undefined);
				}
			}),
		reset(values) {
			const defaults = values ? (toInternal(values) as NullMap) : state.defaults;
			tracker.reset();
			commit({
				values: defaults,
				defaults,
				sources: new Map(),
				validation: undefined,
				touched: undefined,
				failed: undefined,
				ids: syncIds(undefined, defaults, mintId),
			});
		},
		validate: (paths) => runValidation(paths, { record: true, markFailed: true, retry: true }),
		checkValidity: (paths) => runValidation(paths, { record: false, markFailed: false }),
		setErrors(source, errors) {
			if (source === VALIDATION_ERROR_SOURCE) {
				throw new Error(`The '${VALIDATION_ERROR_SOURCE}' error source belongs to the store`);
			}
			const sources = new Map(state.sources);
			sources.delete(source);
			const tree = fromEntries(
				Object.entries(errors).map(([path, error]) => [
					path,
					Object.freeze({ type: error.type ?? source, message: error.message ?? '' }),
				]),
			);
			if (tree !== undefined) sources.set(source, tree);
			commit({ sources });
		},
		fieldArray,
		adoptRowIds(path, ids) {
			const nodes = idsAt(state.ids, path);
			if (!Array.isArray(nodes) || nodes.length !== ids.length || new Set(ids).size !== ids.length) return;
			const rows = nodes as readonly RowNode[];
			if (rows.every((row, index) => row.id === ids[index])) return;
			for (const id of ids) adoptedIds.add(id);
			commit({
				ids: replaceIdsAt(
					state.ids,
					path,
					rows.map((row, index) =>
						row.below === undefined ? { id: ids[index] } : { id: ids[index], below: row.below },
					),
				),
			});
		},
	};
}
