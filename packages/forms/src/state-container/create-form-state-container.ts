import { validateFormValues } from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { resolveFieldRef } from '@/lib/field-ref';
import { logger } from '@/lib/logger';
import { getValueAtPath } from '@/lib/path-values';
import { isReservedPathKey } from '@/lib/reserved-path-keys';
import {
	buildDependencyIndex,
	shouldSurfaceDependentError,
	type DependencyIndex,
} from '@/schemas/validation/dependencies';
import { dirtyTree } from './dirty';
import type { FieldArrayCommands } from './field-array';
import { anchorOf, flatIds, idsAt, replaceIdsAt, resolveAnchor, syncIds, type IdTree, type RowNode } from './row-ids';
import { selectFieldState } from './selectors';
import { createRunTracker } from './stale-results';
import {
	clearAround,
	clearAt,
	clearSelfAt,
	conformAt,
	coveredAt,
	entries,
	fromEntries,
	markAt,
	reorderAt,
	selfAt,
	setSelfAt,
	stable,
	type IsArrayAt,
	type Tree,
} from './state-tree';
import {
	FORM_ROOT,
	type FormErrorSource,
	type FormStateContainer,
	type FormStateContainerOptions,
	type FormStateError,
	type FormStateIssue,
	type FormStateSnapshot,
	type NativeValidity,
} from './types';
import {
	changedPaths,
	createMap,
	isStructural,
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
 * Everything the container holds. Replaced as a whole by every command; no part is mutated.
 *
 * @remarks
 * Field state is held in the shape of the values (see `state-tree.ts`), so a row's state is the row's
 * element of each array and moves with it. The container's own errors are `validation`; a host's are in
 * `native` and `server`. `failed` marks the paths whose check failed, `''` for the whole form.
 */
interface State {
	readonly values: NullMap;
	readonly defaults: NullMap;
	readonly validation: Tree<Issues>;
	readonly server: Tree<Issues>;
	readonly native: Readonly<Record<string, NativeValidity>>;
	readonly touched: Tree<true>;
	readonly failed: Tree<true>;
	readonly dirty: Tree<true>;
	readonly ids: IdTree | undefined;
	readonly validating: number;
}

/** The issues of one path in one source. */
type Issues = readonly FormStateIssue[];

/** A row while an operation rebuilds an array: where it was, and what it is now. */
interface RowEntry {
	readonly from?: number;
	readonly value: unknown;
	readonly node: RowNode;
}

const HOST_SOURCES: readonly string[] = ['server'] satisfies readonly FormErrorSource[];
const NO_NATIVE: Readonly<Record<string, NativeValidity>> = Object.freeze({});
const readAt = (root: NullMap, path: string): unknown => getValueAtPath(root, path);
const isRow = (index: number, length: number): boolean => Number.isInteger(index) && index >= 0 && index < length;
const asRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);
const issue = (type: string, message: string, source: FormStateIssue['source']): FormStateIssue =>
	Object.freeze({ type, message, source });

/** The previous issues when `next` says the same, so an unchanged path keeps its objects. */
const reuseIssues = (previous: Issues | undefined, next: Issues): Issues =>
	previous &&
	previous.length === next.length &&
	previous.every((known, index) => {
		const candidate = next[index];
		return (
			known.type === candidate.type && known.message === candidate.message && known.source === candidate.source
		);
	})
		? previous
		: Object.freeze([...next]);

/** The error a list of issues makes, reusing `previous` when nothing in it changed. */
function errorOf(issues: Issues, previous: FormStateError | undefined): FormStateError {
	if (
		previous &&
		previous.all.length === issues.length &&
		previous.all.every(
			(known, index) =>
				known.type === issues[index].type &&
				known.message === issues[index].message &&
				known.source === issues[index].source,
		)
	) {
		return previous;
	}
	return Object.freeze({ ...issues[0], all: Object.freeze([...issues]) });
}

const internalPath = (path: string): string => (path === FORM_ROOT ? '' : path);
const publicPath = (path: string): string => (path === '' ? FORM_ROOT : path);

/**
 * Creates the engine's reference {@link FormStateContainer}: framework-free, with the engine's validation.
 *
 * @remarks
 * Values live in null-prototype maps and come out of the snapshot as frozen plain records; both views
 * share structure, so a branch no command touched keeps its reference. Validation goes through
 * `validateFormValues` with one debounce scope for recorded validation. A silent
 * {@link FormStateContainer.checkValidity} gets a scope of its own, so it never replaces a debounced call of
 * the validation that writes errors.
 *
 * Errors, touched marks and failed checks are trees with a slot per node, in the shape of the values. A
 * row operation is one splice, applied to the values and to every tree in the same commit, so state cannot
 * fall out of step with its rows. A validation result that arrives late finds its fields by row id, not by index.
 */
export function createFormStateContainer(options: FormStateContainerOptions): FormStateContainer {
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

	const initialDefaults = toInternal(options.defaults ?? {}) as NullMap;
	let state: State = {
		values: initialDefaults,
		defaults: initialDefaults,
		validation: undefined,
		server: undefined,
		native: NO_NATIVE,
		touched: undefined,
		failed: undefined,
		dirty: undefined,
		ids: adoptAll(syncIds(undefined, initialDefaults, mintId), options.rowIds ?? {}),
		validating: 0,
	};

	/** Whether the value at a path is an array, which decides how its field state is shaped. */
	const isArrayAt: IsArrayAt = (path) => Array.isArray(readAt(state.values, path));

	function adoptAt(ids: IdTree | undefined, path: string, adopted: readonly string[]): IdTree | undefined {
		const rows = idsAt(ids, path);
		if (!Array.isArray(rows)) {
			logger.warn(`Row ids were given for '${path}', which is not an array in the defaults; they were ignored.`);
			return ids;
		}
		if (rows.length !== adopted.length) {
			logger.warn(
				`Row ids were given for '${path}' for ${adopted.length} rows, but it has ${rows.length}; the ids the container minted stay.`,
			);
			return ids;
		}
		if (new Set(adopted).size !== adopted.length) {
			logger.warn(`Row ids given for '${path}' are not unique; the ids the container minted stay.`);
			return ids;
		}
		for (const id of adopted) adoptedIds.add(id);
		return replaceIdsAt(
			ids,
			path,
			(rows as readonly RowNode[]).map((row, index) =>
				row.below === undefined ? { id: adopted[index] } : { id: adopted[index], below: row.below },
			),
		);
	}

	function adoptAll(
		ids: IdTree | undefined,
		adopted: Readonly<Record<string, readonly string[]>>,
	): IdTree | undefined {
		return Object.keys(adopted)
			.toSorted((a, b) => a.split('.').length - b.split('.').length)
			.reduce((current, path) => adoptAt(current, path, adopted[path]), ids);
	}

	let errorsFor: { validation: Tree<Issues>; server: Tree<Issues>; flat: NullMap<FormStateError> } | undefined;
	/** The error of each path: what the server said, then the container's validation, the first shown. */
	function effectiveErrors(current: State): NullMap<FormStateError> {
		if (errorsFor && errorsFor.validation === current.validation && errorsFor.server === current.server) {
			return errorsFor.flat;
		}
		const found = createMap<FormStateIssue[]>();
		for (const tree of [current.server, current.validation]) {
			for (const [path, issues] of entries(tree)) (found[publicPath(path)] ??= []).push(...issues);
		}
		const merged = createMap<FormStateError>();
		for (const [path, issues] of Object.entries(found)) {
			merged[path] = errorOf(issues, errorsFor?.flat[path]);
		}
		const flat = stabilize(errorsFor?.flat ?? createMap<FormStateError>(), merged);
		errorsFor = { validation: current.validation, server: current.server, flat };
		return flat;
	}

	const marksFor = new Map<string, { tree: Tree<true>; flat: NullMap<true> }>();
	function marks(kind: 'touched' | 'dirty', tree: Tree<true>): NullMap<true> {
		const known = marksFor.get(kind);
		if (known && known.tree === tree) return known.flat;
		const merged = createMap<true>();
		for (const [path] of entries(tree)) merged[path] = true;
		const flat = stabilize(known?.flat ?? createMap<true>(), merged);
		marksFor.set(kind, { tree, flat });
		return flat;
	}

	let flatIdsFor: { ids: IdTree | undefined; flat: NullMap<readonly string[]> } | undefined;
	function flatRowIds(current: State): NullMap<readonly string[]> {
		if (flatIdsFor && flatIdsFor.ids === current.ids) return flatIdsFor.flat;
		const flat = stabilize(flatIdsFor?.flat ?? createMap<readonly string[]>(), flatIds(current.ids));
		flatIdsFor = { ids: current.ids, flat };
		return flat;
	}

	function toSnapshot(current: State): FormStateSnapshot {
		const errors = effectiveErrors(current);
		return Object.freeze({
			values: toPlain(current.values) as FormStateSnapshot['values'],
			defaults: toPlain(current.defaults) as FormStateSnapshot['defaults'],
			errors: toPlainMap(errors),
			touched: toPlainMap(marks('touched', current.touched)),
			dirty: toPlainMap(marks('dirty', current.dirty)),
			rowIds: toPlainMap(flatRowIds(current)),
			isValidating: current.validating > 0,
			isValid: Object.keys(errors).length === 0,
		});
	}

	let snapshot = toSnapshot(state);
	const serverSnapshot = snapshot;

	/** Rejects a path whose segment the engine reserves, as no field can be named that. */
	function assertFieldPath(path: string, command: string): void {
		const reserved = path.split('.').find(isReservedPathKey);
		if (reserved !== undefined) {
			throw new Error(
				`${command}: '${path}' has the reserved segment '${reserved}'; segments cannot start with '__'.`,
			);
		}
	}

	/** Rejects a path that names a row its array does not have; a path below an absent object is allowed. */
	function assertRowsExist(path: string): void {
		const segments = internalPath(path).split('.').filter(Boolean);
		segments.forEach((segment, depth) => {
			const above = segments.slice(0, depth).join('.');
			const value = depth === 0 ? state.values : readAt(state.values, above);
			if (
				Array.isArray(value) &&
				!(String(Number(segment)) === segment && Number(segment) >= 0 && Number(segment) < value.length)
			) {
				throw new Error(
					`setErrors: '${path}' names row '${segment}' of '${above}', which has ${value.length} rows.`,
				);
			}
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
		const changed = (Object.keys(nextSnapshot) as Array<keyof FormStateSnapshot>).some(
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

	/** The errors a host set, which a silent check counts as well. */
	function hostErrorPaths(): string[] {
		return entries(state.server).map(([path]) => publicPath(path));
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
	 * was written while it ran, a value a rule of the path reads changed, or a validation that started later
	 * asked for the path. A reset drops the whole result, nothing is run again, and the call resolves `false`. When part of a result
	 * is dropped otherwise, an explicit validation runs once more and resolves with the validity of the
	 * current state; a silent check writes nothing.
	 */
	async function runValidation(names: readonly string[] | undefined, mode: ValidationMode): Promise<boolean> {
		if (names?.length === 0) return true;
		const startValues = state.values;
		const startIds = state.ids;
		const startValidation = state.validation;
		const startNative = state.native;
		const startIndex = mode.record ? dependencyIndex() : undefined;
		const run = mode.record
			? tracker.start(
					names?.map((name) => anchorOf(startIds, name)),
					mode.exact === true,
				)
			: undefined;
		if (mode.record) commit({ validating: state.validating + 1 });
		const settleRun = (): void => {
			if (!run) return;
			tracker.finish(run);
			commit({ validating: state.validating - 1 });
		};
		let found: Awaited<ReturnType<typeof validateFormValues>>;
		try {
			found = await validateFormValues({
				elements,
				registry,
				values: toPlain(startValues) as Record<string, unknown>,
				names,
				exactNames: mode.exact,
				debounceScope: mode.record ? debounceScope : silentDebounceScope,
			});
		} catch (error) {
			settleRun();
			throw error;
		}
		const inScope = (path: string): boolean =>
			!names || (mode.exact ? names.includes(path) : names.some((name) => isWithin(path, name)));
		const flat = createMap<Issues>();
		for (const [path, error] of Object.entries(found)) {
			flat[path] = error.all.map((rule) => issue(rule.type, rule.message, 'validation'));
		}
		for (const [path, fact] of Object.entries(startNative)) {
			if (inScope(path)) flat[path] = [...(flat[path] ?? []), issue(fact.type, fact.message ?? '', 'native')];
		}
		const passed = Object.keys(flat).length === 0;
		if (!run || !startIndex) return passed && !hostErrorPaths().some(inScope);
		if (tracker.outdated(run)) {
			settleRun();
			return false;
		}

		const now = (path: string): string | undefined => resolveAnchor(anchorOf(startIds, path), state.ids);
		const movedSince = (path: string): boolean => {
			const current = now(path);
			return current === undefined || !Object.is(readAt(state.values, current), readAt(startValues, path));
		};
		const dependencyChanged = (path: string): boolean =>
			startIndex.referencesOf(path).some((reference) => {
				const current = now(path);
				if (current === undefined) return true;
				return !Object.is(
					readAt(state.values, resolveFieldRef(reference, current)),
					readAt(startValues, resolveFieldRef(reference, path)),
				);
			});
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
			tracker.superseded(run, current, (anchor) => resolveAnchor(anchor, state.ids)) ||
			dependencyChanged(path);
		const decided = [
			...new Set([
				...entries(startValidation)
					.map(([path]) => path)
					.filter(inScope),
				...Object.keys(flat),
			]),
		].map((path) => ({ path, current: now(path) }));
		const scopeStale = (): boolean =>
			changedPaths(startValues, state.values).some(
				(changed) => !names || names.some((name) => isWithin(changed, name) || isWithin(name, changed)),
			) ||
			startIndex.watched.some(
				(watched) =>
					!Object.is(readAt(state.values, watched), readAt(startValues, watched)) &&
					startIndex.dependentsOf(watched).some(inScope),
			);
		if (mode.retry && (scopeStale() || decided.some(({ path, current }) => stale(path, current)))) {
			return batch(() => {
				settleRun();
				return runValidation(names, { ...mode, retry: false });
			});
		}

		let validation = state.validation;
		for (const { path, current } of decided) {
			if (current !== undefined && !stale(path, current)) {
				const issues = flat[path] as Issues | undefined;
				validation = setSelfAt(
					validation,
					current,
					issues && reuseIssues(selfAt(validation, current), issues),
					isArrayAt,
				);
			}
		}
		let failed = state.failed;
		if (mode.markFailed && !passed) {
			failed = names
				? names.reduce((tree, name) => {
						const current = now(name);
						return current === undefined ? tree : markAt(tree, current, isArrayAt);
					}, failed)
				: setSelfAt(failed, '', true, isArrayAt);
		}
		tracker.finish(run);
		commit({ validation, failed, validating: state.validating - 1 });
		const scopeNow = names?.flatMap((name) => now(name) ?? []);
		const stillInScope = (path: string): boolean =>
			!scopeNow || (mode.exact ? scopeNow.includes(path) : scopeNow.some((name) => isWithin(path, name)));
		return passed && !Object.keys(effectiveErrors(state)).some(stillInScope);
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

	/** What a host set no longer describes the value at `path`, or the paths around it, once it changed. */
	function dropHostErrors(path: string, includeBelow: boolean): Tree<Issues> {
		const around = clearAround(state.server, path);
		return includeBelow ? clearAt(around, path) : clearSelfAt(around, path);
	}

	function setValue(path: string, value: unknown): void {
		const previousValues = state.values;
		const branch = reconcile(readAt(previousValues, path), toInternal(value));
		const values = setIn(previousValues, path, branch);
		if (values === previousValues) return;
		const root = path.split('.')[0];
		const idsRoot = syncIds(idsAt(state.ids, root), readAt(values, root), mintId);
		batch(() => {
			commit({
				values,
				ids: replaceIdsAt(state.ids, root, idsRoot),
				server: dropHostErrors(path, true),
				validation: conformAt(state.validation, path, branch),
				touched: conformAt(state.touched, path, branch),
				failed: conformAt(state.failed, path, branch),
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
		const root = path.split('.')[0];
		const placed = replaceIdsAt(
			state.ids,
			path,
			rows.map((row) => row.node),
		);
		const spliced = (tree: Tree<Issues>) => reorderAt(tree, path, order);
		batch(() => {
			commit({
				values,
				ids: replaceIdsAt(placed, root, syncIds(idsAt(placed, root), readAt(values, root), mintId)),
				server: spliced(dropHostErrors(path, false)),
				validation: spliced(state.validation),
				touched: reorderAt(state.touched, path, order),
				failed: reorderAt(state.failed, path, order),
			});
			afterChange(previousValues, path, true);
		});
	}

	const fresh = (value: unknown): RowEntry => {
		const internal = toInternal(value);
		return { value: internal, node: { id: mintId(), below: syncIds(undefined, internal, mintId) } };
	};

	const fieldArrays = new Map<string, FieldArrayCommands>();
	function fieldArray(path: string): FieldArrayCommands {
		const known = fieldArrays.get(path);
		if (known) return known;
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
		const commands: FieldArrayCommands = {
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
		fieldArrays.set(path, commands);
		return commands;
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
		getFieldState: (path) => selectFieldState(snapshot, path),
		setValue,
		blur: (path) =>
			batch(() => {
				assertFieldPath(path, 'blur');
				if (!isTouched(path)) commit({ touched: markAt(state.touched, path, isArrayAt) });
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
				validation: undefined,
				server: undefined,
				native: NO_NATIVE,
				touched: undefined,
				failed: undefined,
				ids: syncIds(undefined, defaults, mintId),
			});
		},
		validate: (paths) => runValidation(paths, { record: true, markFailed: true, retry: true }),
		checkValidity: (paths) => runValidation(paths, { record: false, markFailed: false }),
		setErrors(source, errors) {
			if (!HOST_SOURCES.includes(source)) {
				throw new Error(`Unknown error source '${String(source)}': a host sets ${HOST_SOURCES.join(', ')}.`);
			}
			const known = state.server;
			const marks = Object.entries(errors).map(([path, input]): [string, Issues] => {
				const where = internalPath(path);
				if (path !== FORM_ROOT) assertFieldPath(path, 'setErrors');
				assertRowsExist(path);
				return [
					where,
					reuseIssues(selfAt(known, where), [issue(input.type ?? source, input.message ?? '', source)]),
				];
			});
			commit({ server: stable(known, fromEntries(marks, isArrayAt)) });
		},
		setNativeValidity(validity) {
			const facts = createMap<NativeValidity>();
			for (const [path, fact] of Object.entries(validity)) {
				assertFieldPath(path, 'setNativeValidity');
				facts[path] = Object.freeze({
					type: fact.type,
					...(fact.message === undefined ? {} : { message: fact.message }),
				});
			}
			state = { ...state, native: Object.freeze(facts) };
		},
		fieldArray,
	};
}
