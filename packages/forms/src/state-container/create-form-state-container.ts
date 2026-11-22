import {
	hasParticipationRules,
	isPathExcluded,
	planFormValidation,
	resolveExcludedPaths,
	runValidationPlan,
	type FormValidationFailure,
	type ValidationIssue,
} from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { resolveFieldRef } from '@/lib/field-ref';
import { logger } from '@/lib/logger';
import { frozenCopy } from '@/lib/frozen-copy';
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
import { Submission, type SubmissionRecord } from './submission';
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
	nodeAt,
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
	type FormStateErrorInput,
	type FormStateFailure,
	type FormStateIssue,
	type FormStateSnapshot,
	type NativeOptions,
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

/** The issues of one path in one source. */
type Issues = readonly FormStateIssue[];

/**
 * What the container's own validation recorded for one path.
 *
 * @remarks Nothing is stored for a path that has no errors, warnings or failures.
 */
interface Finding {
	readonly errors: Issues;
	readonly warnings: Issues;
	readonly failures: readonly FormStateFailure[];
}

/** What a rule of a path read when a server error was applied, so an edit of it clears the error. */
interface Dependency {
	readonly reference: string;
	readonly value: unknown;
}

/** A server error: its issues, and the values its path's rules read when it was applied. */
interface ServerEntry {
	readonly issues: Issues;
	readonly dependencies: readonly Dependency[];
}

/** A native fact and the value it describes; it is dropped once the value at its path is another. */
interface NativeFact {
	readonly validity: NativeValidity;
	readonly value: unknown;
}

/**
 * Everything the container holds. Replaced as a whole by every command; no part is mutated.
 *
 * @remarks
 * Field state is held in the shape of the values (see `state-tree.ts`), so a row's state is the row's
 * element of each array and moves with it. `validation` is what the container's own checks recorded,
 * `server` what a host set, `native` what the controls reported with their input. `failed` marks the
 * paths whose check failed and `validated` those a recorded check decided, `''` for the whole form.
 * `validating` marks the paths a check is running for. `excluded` lists the paths that take no part.
 */
interface State {
	readonly values: NullMap;
	readonly defaults: NullMap;
	readonly validation: Tree<Finding>;
	readonly server: Tree<ServerEntry>;
	readonly native: Tree<NativeFact>;
	readonly touched: Tree<true>;
	readonly failed: Tree<true>;
	readonly validated: Tree<true>;
	readonly validating: Tree<true>;
	readonly dirty: Tree<true>;
	readonly ids: IdTree | undefined;
	readonly running: number;
	readonly excluded: readonly string[];
	readonly exclusionVersion: number;
}

/** A row while an operation rebuilds an array: where it was, and what it is now. */
interface RowEntry {
	readonly from?: number;
	readonly value: unknown;
	readonly node: RowNode;
}

/** What a rule check found for one path. */
interface PathFindings {
	readonly errors: FormStateIssue[];
	readonly warnings: FormStateIssue[];
	readonly failures: FormStateFailure[];
}

const HOST_SOURCES: readonly string[] = ['server'] satisfies readonly FormErrorSource[];
const NO_ISSUES: Issues = Object.freeze([]);
const readAt = (root: NullMap, path: string): unknown => getValueAtPath(root, path);
const isRow = (index: number, length: number): boolean => Number.isInteger(index) && index >= 0 && index < length;
const asRows = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);
const arrayIn =
	(values: NullMap): IsArrayAt =>
	(path) =>
		Array.isArray(readAt(values, path));

interface IssueParts {
	readonly ruleId?: string;
	readonly params?: Readonly<Record<string, unknown>>;
	readonly message?: string;
}

const issue = (type: string, source: FormStateIssue['source'], parts: IssueParts = {}): FormStateIssue =>
	Object.freeze({
		type,
		source,
		...(parts.ruleId === undefined ? {} : { ruleId: parts.ruleId }),
		...(parts.params === undefined ? {} : { params: parts.params }),
		...(parts.message === undefined ? {} : { message: parts.message }),
	});

const ruleIssue = (found: ValidationIssue): FormStateIssue =>
	issue(found.type, 'validation', { ruleId: found.ruleId, params: found.params, message: found.message });

const nativeIssue = (validity: NativeValidity): FormStateIssue =>
	issue(validity.type, 'native', { params: validity.params, message: validity.message });

const sameParams = (a: unknown, b: unknown): boolean => Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);

const sameIssue = (a: FormStateIssue, b: FormStateIssue): boolean =>
	a.type === b.type &&
	a.source === b.source &&
	a.ruleId === b.ruleId &&
	a.message === b.message &&
	sameParams(a.params, b.params);

const sameIssues = (a: Issues, b: Issues): boolean =>
	a.length === b.length && a.every((known, index) => sameIssue(known, b[index]));

/** The previous issues when `next` says the same, so an unchanged path keeps its objects. */
const reuseIssues = (previous: Issues | undefined, next: Issues): Issues =>
	previous && sameIssues(previous, next) ? previous : Object.freeze([...next]);

const sameFailure = (a: FormStateFailure, b: FormStateFailure): boolean =>
	a.path === b.path && a.ruleType === b.ruleType && a.ruleId === b.ruleId && a.reason === b.reason;

/** What a snapshot keeps of a rule that could not run: plain data, without the error and its cause. */
const failureData = (failure: FormValidationFailure): FormStateFailure =>
	Object.freeze({
		path: failure.path,
		ruleType: failure.ruleType,
		reason: failure.reason,
		...(failure.ruleId === undefined ? {} : { ruleId: failure.ruleId }),
	});

const sameFailures = (a: readonly FormStateFailure[], b: readonly FormStateFailure[]): boolean =>
	a.length === b.length && a.every((known, index) => sameFailure(known, b[index]));

/** The previous finding when `next` reports the same, `undefined` when it reports nothing. */
function reuseFinding(
	previous: Finding | undefined,
	errors: Issues,
	warnings: Issues,
	failures: readonly FormStateFailure[],
): Finding | undefined {
	if (errors.length === 0 && warnings.length === 0 && failures.length === 0) return undefined;
	if (
		previous &&
		sameIssues(previous.errors, errors) &&
		sameIssues(previous.warnings, warnings) &&
		sameFailures(previous.failures, failures)
	) {
		return previous;
	}
	return Object.freeze({
		errors: errors.length === 0 ? NO_ISSUES : Object.freeze([...errors]),
		warnings: warnings.length === 0 ? NO_ISSUES : Object.freeze([...warnings]),
		failures: Object.freeze([...failures]),
	});
}

/** The error a list of issues makes, reusing `previous` when nothing in it changed. */
function errorOf(issues: Issues, previous: FormStateError | undefined): FormStateError {
	if (previous && sameIssues(previous.all, issues)) return previous;
	return Object.freeze({ ...issues[0], all: Object.freeze([...issues]) });
}

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
	a.length === b.length && a.every((value, index) => value === b[index]);

const internalPath = (path: string): string => (path === FORM_ROOT ? '' : path);
const publicPath = (path: string): string => (path === '' ? FORM_ROOT : path);

const hasMarkAround = (tree: Tree<true>, path: string): boolean =>
	coveredAt(tree, path) || nodeAt(tree, path) !== undefined;

/**
 * The row a path names that its array does not have, if any.
 *
 * @remarks An index segment below a value that is not an array or an object (absent, or a primitive) names a row of an array with no rows; a name below an absent object does not.
 */
function missingRow(
	path: string,
	values: NullMap,
): { readonly segment: string; readonly above: string; readonly length: number } | undefined {
	const segments = internalPath(path).split('.').filter(Boolean);
	for (const [depth, segment] of segments.entries()) {
		const above = segments.slice(0, depth).join('.');
		const value = depth === 0 ? values : readAt(values, above);
		const isIndex =
			String(Number(segment)) === segment && Number.isInteger(Number(segment)) && Number(segment) >= 0;
		if (Array.isArray(value) && !(isIndex && Number(segment) < value.length)) {
			return { segment, above, length: value.length };
		}
		if (/^\d+$/.test(segment) && !Array.isArray(value) && !isStructural(value)) {
			return { segment, above, length: 0 };
		}
	}
	return undefined;
}

/** Whether the values hold `path`: its rows exist and every container above it is there. A leaf with no value is held. */
function holds(path: string, values: NullMap): boolean {
	if (missingRow(path, values)) return false;
	const segments = path.split('.');
	return segments
		.slice(0, -1)
		.every((_, depth) => isStructural(readAt(values, segments.slice(0, depth + 1).join('.'))));
}

/** The marks that belong to paths taking part. */
function withoutExcluded(flat: NullMap<true>, excluded: readonly string[]): NullMap<true> {
	if (excluded.length === 0) return flat;
	const kept = createMap<true>();
	for (const path of Object.keys(flat)) if (!isPathExcluded(excluded, path)) kept[path] = true;
	return stabilize(flat, kept);
}

/** The errors of each path in `found`, reusing the objects of `previous` while their issues are unchanged. */
function shapeErrors(
	found: NullMap<FormStateIssue[]>,
	previous: NullMap<FormStateError> | undefined,
): NullMap<FormStateError> {
	const merged = createMap<FormStateError>();
	for (const [path, issues] of Object.entries(found)) merged[path] = errorOf(issues, previous?.[path]);
	return stabilize(previous ?? createMap<FormStateError>(), merged);
}

/** The fact for `validity` and the value it describes, `previous` when it says the same. */
function factOf(previous: NativeFact | undefined, validity: NativeValidity, value: unknown): NativeFact {
	if (
		previous &&
		Object.is(previous.value, value) &&
		previous.validity.type === validity.type &&
		previous.validity.message === validity.message &&
		sameParams(previous.validity.params, validity.params)
	) {
		return previous;
	}
	return Object.freeze({
		validity: Object.freeze({
			type: validity.type,
			...(validity.params === undefined ? {} : { params: frozenCopy(validity.params) }),
			...(validity.message === undefined ? {} : { message: validity.message }),
		}),
		value,
	});
}

/** The native facts with the ones that describe a value that is gone removed. */
function pruneNative(tree: Tree<NativeFact>, values: NullMap): Tree<NativeFact> {
	return stable(
		tree,
		entries(tree).reduce(
			(kept, [path, fact]) => (Object.is(readAt(values, path), fact.value) ? kept : clearSelfAt(kept, path)),
			tree,
		),
	);
}

/**
 * The facts a flush reports, and no others: a control that is not in the map is not mounted and cannot vouch for its value.
 *
 * @remarks Reuses `previous` where nothing changed, and ignores facts for rows that do not exist.
 */
function flushedFacts(
	previous: Tree<NativeFact>,
	reported: Readonly<Record<string, NativeValidity | null>>,
	values: NullMap,
): Tree<NativeFact> {
	let facts: Tree<NativeFact>;
	for (const [path, validity] of Object.entries(reported)) {
		assertFieldPath(path, 'native');
		if (validity === null || missingRow(path, values)) continue;
		facts = setSelfAt(facts, path, factOf(selfAt(previous, path), validity, readAt(values, path)), arrayIn(values));
	}
	return stable(previous, facts);
}

/** What a path's rules read, as the values they have now. */
function dependenciesOf(path: string, values: NullMap, index: DependencyIndex): readonly Dependency[] {
	return index
		.referencesOf(path)
		.map((reference) => ({ reference, value: readAt(values, resolveFieldRef(reference, path)) }));
}

/** The issues a host gave for one path, as the container keeps them. */
function serverIssues(input: FormStateErrorInput | readonly FormStateErrorInput[]): Issues {
	return (Array.isArray(input) ? (input as readonly FormStateErrorInput[]) : [input as FormStateErrorInput]).map(
		(given) =>
			issue(given.type ?? 'server', 'server', {
				params: given.params === undefined ? undefined : frozenCopy(given.params),
				message: given.message,
			}),
	);
}

/** Rejects a path whose segment the engine reserves, as no field can be named that. */
function assertFieldPath(path: string, command: string): void {
	const reserved = path.split('.').find(isReservedPathKey);
	if (reserved !== undefined) {
		throw new Error(
			`${command}: '${path}' has the reserved segment '${reserved}'; a segment cannot start with '__' or be constructor, prototype or __proto__.`,
		);
	}
}

/** Rejects a path that names a row its array does not have; a path below an absent object is allowed. */
function assertRowsExist(path: string, values: NullMap): void {
	const missing = missingRow(path, values);
	if (missing) {
		throw new Error(
			`setErrors: '${path}' names row '${missing.segment}' of '${missing.above}', which has ${missing.length} rows.`,
		);
	}
}

/** The facts with `reported` recorded for `path`: absent leaves them, `null` withdraws, a fact is kept with the value it describes. */
function withFact(
	tree: Tree<NativeFact>,
	path: string,
	reported: NativeValidity | null | undefined,
	values: NullMap,
): Tree<NativeFact> {
	if (reported === undefined) return tree;
	if (reported === null) return stable(tree, clearSelfAt(tree, path));
	return setSelfAt(tree, path, factOf(selfAt(tree, path), reported, readAt(values, path)), arrayIn(values));
}

/**
 * Creates the engine's reference {@link FormStateContainer}: framework-free, with the engine's validation.
 *
 * @remarks
 * Values live in null-prototype maps and come out of the snapshot as frozen plain records; both views
 * share structure, so a branch no command touched keeps its reference. Validation goes through
 * `planFormValidation` and `runValidationPlan` with one debounce scope for recorded validation. Each silent
 * {@link FormStateContainer.checkValidity} gets a scope of its own, so it neither replaces a debounced call of
 * the validation that writes errors nor another check's, and answers for the value it was called with.
 *
 * Errors, native facts, touched marks and checks are trees with a slot per node, in the shape of the
 * values. A row operation is one splice, applied to the values and to every tree in the same commit, so
 * state cannot fall out of step with its rows. A validation result that arrives late finds its fields by
 * row id, not by index, and is applied only while the scope it covered is current.
 */
export function createFormStateContainer(options: FormStateContainerOptions): FormStateContainer {
	const { elements, registry, validationMode = 'onSubmit', reValidateMode = 'onChange' } = options;
	const tracker = createRunTracker();
	const debounceScope = createDebounceScope();
	const listeners = new Set<() => void>();
	const participates = hasParticipationRules(elements);
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
		native: undefined,
		touched: undefined,
		failed: undefined,
		validated: undefined,
		validating: undefined,
		dirty: undefined,
		ids: adoptAll(syncIds(undefined, initialDefaults, mintId), options.rowIds ?? {}),
		running: 0,
		excluded: Object.freeze(
			participates ? resolveExcludedPaths(elements, toPlain(initialDefaults) as Record<string, unknown>) : [],
		),
		exclusionVersion: 0,
	};

	/** Whether the value at a path is an array, which decides how its field state is shaped. */
	const isArrayNow: IsArrayAt = (path) => Array.isArray(readAt(state.values, path));

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

	interface Derived {
		readonly validation: Tree<Finding>;
		readonly server: Tree<ServerEntry>;
		readonly excluded: readonly string[];
		readonly errors: NullMap<FormStateError>;
		readonly warnings: NullMap<FormStateError>;
		readonly failures: NullMap<readonly FormStateFailure[]>;
	}
	let derivedFor: Derived | undefined;

	/**
	 * The error and the warning of each path, and the rules that could not run.
	 *
	 * @remarks
	 * An error lists what the server said, then what the container's validation recorded (the rules in
	 * authored order, then the native fact), the first shown. A path that takes no part has none of them.
	 * Server errors are left out here, not deleted, so a path that takes part again finds them as they were;
	 * `commit` clears what the checks recorded for a path the moment it is excluded, since a path that
	 * returns is re-validated and its old findings described a value it may no longer have.
	 */
	function derive(current: State): Derived {
		if (
			derivedFor &&
			derivedFor.validation === current.validation &&
			derivedFor.server === current.server &&
			derivedFor.excluded === current.excluded
		) {
			return derivedFor;
		}
		const takesPart = ([path]: readonly [string, unknown]) => !isPathExcluded(current.excluded, path);
		const errors = createMap<FormStateIssue[]>();
		for (const [path, entry] of entries(current.server).filter(takesPart)) {
			(errors[publicPath(path)] ??= []).push(...entry.issues);
		}
		const warnings = createMap<FormStateIssue[]>();
		const failures = createMap<readonly FormStateFailure[]>();
		const before = derivedFor;
		for (const [path, finding] of entries(current.validation).filter(takesPart)) {
			const where = publicPath(path);
			if (finding.errors.length > 0) (errors[where] ??= []).push(...finding.errors);
			if (finding.warnings.length > 0) warnings[where] = [...finding.warnings];
			if (finding.failures.length > 0) failures[where] = finding.failures;
		}
		derivedFor = {
			validation: current.validation,
			server: current.server,
			excluded: current.excluded,
			errors: shapeErrors(errors, before?.errors),
			warnings: shapeErrors(warnings, before?.warnings),
			failures: stabilize(before?.failures ?? createMap(), failures),
		};
		return derivedFor;
	}

	const marksFor = new Map<string, { tree: Tree<true>; excluded: readonly string[]; flat: NullMap<true> }>();
	function marks(kind: string, tree: Tree<true>, excluded: readonly string[] = []): NullMap<true> {
		const known = marksFor.get(kind);
		if (known && known.tree === tree && known.excluded === excluded) return known.flat;
		const merged = createMap<true>();
		for (const [path] of entries(tree)) merged[publicPath(path)] = true;
		const flat = stabilize(known?.flat ?? createMap<true>(), withoutExcluded(merged, excluded));
		marksFor.set(kind, { tree, excluded, flat });
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
		const derived = derive(current);
		return Object.freeze({
			values: toPlain(current.values) as FormStateSnapshot['values'],
			defaults: toPlain(current.defaults) as FormStateSnapshot['defaults'],
			errors: toPlainMap(derived.errors),
			warnings: toPlainMap(derived.warnings),
			touched: toPlainMap(marks('touched', current.touched)),
			dirty: toPlainMap(marks('dirty', current.dirty)),
			rowIds: toPlainMap(flatRowIds(current)),
			validating: toPlainMap(marks('validating', current.validating, current.excluded)),
			validationFailures: toPlainMap(derived.failures),
			isValidating: current.running > 0,
			isValid: Object.keys(derived.errors).length === 0,
		});
	}

	let snapshot = toSnapshot(state);
	const serverSnapshot = snapshot;

	let batchDepth = 0;
	let notifyAfterBatch = false;

	function notify(): void {
		for (const listener of listeners) listener();
	}

	/**
	 * Runs one command's synchronous work, so every commit in it reaches subscribers as one notification.
	 *
	 * @remarks
	 * A command that starts a validation commits the pending marks before the validation's first await; the
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

	/** The server errors whose path's rules read a value other than the one they were applied against. */
	function pruneServer(current: State): Tree<ServerEntry> {
		return stable(
			current.server,
			entries(current.server).reduce(
				(kept, [path, entry]) =>
					entry.dependencies.every(({ reference, value }) =>
						Object.is(readAt(current.values, resolveFieldRef(reference, path)), value),
					)
						? kept
						: clearSelfAt(kept, path),
				current.server,
			),
		);
	}

	/** Applies one update atomically and notifies, only when something observable changed. */
	function commit(change: Partial<State>): void {
		const previous = state;
		let next: State = { ...previous, ...change };
		let reeligible: string[] = [];
		if (next.values !== previous.values || next.defaults !== previous.defaults) {
			next = { ...next, dirty: stable(previous.dirty, dirtyTree(next.values, next.defaults)) };
		}
		if (next.values !== previous.values) {
			if (next.native) next = { ...next, native: pruneNative(next.native, next.values) };
			if (next.server) next = { ...next, server: pruneServer(next) };
			if (participates) {
				const excluded = resolveExcludedPaths(elements, toPlain(next.values) as Record<string, unknown>);
				if (!sameList(excluded, previous.excluded)) {
					const dropped = excluded.filter((path) => !isPathExcluded(previous.excluded, path));
					reeligible = previous.excluded.filter(
						(path) =>
							!isPathExcluded(excluded, path) &&
							(hasMarkAround(next.failed, path) || hasMarkAround(next.validated, path)),
					);
					next = {
						...next,
						excluded: Object.freeze(excluded),
						exclusionVersion: previous.exclusionVersion + 1,
						validation: dropped.reduce((tree, path) => clearAt(tree, path), next.validation),
						validating: dropped.reduce((tree, path) => clearAt(tree, path), next.validating),
					};
				}
			}
		}
		state = next;
		const nextSnapshot = toSnapshot(next);
		const changed = (Object.keys(nextSnapshot) as Array<keyof FormStateSnapshot>).some(
			(key) => nextSnapshot[key] !== snapshot[key],
		);
		if (changed) {
			snapshot = nextSnapshot;
			if (batchDepth > 0) notifyAfterBatch = true;
			else notify();
		}
		if (reeligible.length > 0) validateQuietly(reeligible, { record: true, markFailed: false });
	}

	const isFailed = (path: string): boolean => coveredAt(state.failed, path);
	const isTouched = (path: string): boolean => coveredAt(state.touched, path);

	function validatesOn(event: 'change' | 'blur', path: string): boolean {
		const target = event === 'change' ? 'onChange' : 'onBlur';
		if (isFailed(path)) return reValidateMode === target;
		if (validationMode === 'onTouched') return event === 'blur' || isTouched(path);
		return validationMode === 'all' || validationMode === target;
	}

	interface ValidationMode {
		/** Writes the result, tracks it against later requests and marks its paths pending; a silent check does none of that. */
		readonly record: boolean;
		/** Starts re-validation by `reValidateMode` for the paths when they fail. */
		readonly markFailed: boolean;
		/** Match `names` as exact paths, not as prefixes. */
		readonly exact?: boolean;
		/** Run once more over the same rows when the result was overtaken; a second overtaking resolves `false`. */
		readonly retry?: boolean;
		/** Reject, rather than only record, when a rule could not run. */
		readonly reject?: boolean;
		/** The facts this call alone judges by, from a flush of a silent check; the stored ones otherwise. */
		readonly facts?: { readonly tree: Tree<NativeFact> };
		/** The submission this check validates: it keeps the values of the run that passed. */
		readonly submission?: SubmissionRecord;
	}

	/** Runs a check nobody awaits: an automatic one, which records a rule that could not run and never rejects for it. */
	function validateQuietly(names: readonly string[], mode: ValidationMode): void {
		runValidation(names, mode).catch((error: unknown) => {
			logger.error('A validation the form state container started on its own failed.', { error });
		});
	}

	/**
	 * Validates `names` (the whole form when omitted; nothing when empty) against the values as they are now.
	 *
	 * @remarks
	 * The check records its scope when it starts: the values and native facts it reads, the values its
	 * rules depend on, the rows by id, the exclusions and the reset generation. A silent check answers for
	 * that scope as it was, and for the server errors then too. A recorded result is applied path by path,
	 * at the place its fields have now: each path is found again through the ids of the rows it ran through,
	 * so a result for a row that moved lands on that row, and one for a row that is gone is dropped. It is
	 * dropped for a path when that path's value or native fact changed while it ran, a value a rule of the
	 * path reads changed, or a check that started later asked for the path. A reset drops the whole result,
	 * nothing is run again, and the call resolves `false`. When the scope was overtaken otherwise, an
	 * explicit check runs once more over the same rows, wherever they are by then, and resolves `false` when
	 * that one is overtaken too or a row it was asked about is gone.
	 */
	async function runValidation(names: readonly string[] | undefined, mode: ValidationMode): Promise<boolean> {
		if (names?.length === 0) return true;
		const start = {
			values: state.values,
			ids: state.ids,
			validation: state.validation,
			native: mode.facts ? mode.facts.tree : state.native,
			server: state.server,
			excluded: state.excluded,
			exclusionVersion: state.exclusionVersion,
		};
		const startIndex = mode.record ? dependencyIndex() : undefined;
		const plan = planFormValidation({
			elements,
			values: toPlain(start.values) as Record<string, unknown>,
			names,
			exactNames: mode.exact,
			excluded: start.excluded,
		});
		const planned = [...new Set(plan.fields.map(({ fieldPath }) => fieldPath))];
		const run = mode.record
			? tracker.start(
					names?.map((name) => anchorOf(start.ids, name)),
					mode.exact === true,
				)
			: undefined;
		if (run) {
			commit({
				running: state.running + 1,
				validating: planned.reduce((tree, path) => setSelfAt(tree, path, true, isArrayNow), state.validating),
			});
		}
		const finish = (extra: Partial<State> = {}): void => {
			if (!run) return;
			const resolveNow = (anchor: Parameters<typeof resolveAnchor>[0]) => resolveAnchor(anchor, state.ids);
			let validating = state.validating;
			for (const path of planned) {
				const current = resolveAnchor(anchorOf(start.ids, path), state.ids);
				if (current !== undefined && !tracker.superseded(run, current, resolveNow)) {
					validating = setSelfAt(validating, current, undefined, isArrayNow);
				}
			}
			tracker.finish(run);
			commit({ ...extra, validating, running: state.running - 1 });
		};
		let outcome: Awaited<ReturnType<typeof runValidationPlan>>;
		try {
			outcome = await runValidationPlan(plan, {
				registry,
				debounceScope: mode.record ? debounceScope : createDebounceScope(),
			});
		} catch (error) {
			finish();
			throw error;
		}
		const inScope = (path: string): boolean =>
			!names || (mode.exact ? names.includes(path) : names.some((name) => isWithin(path, name)));
		const found = createMap<PathFindings>();
		const at = (path: string): PathFindings => (found[path] ??= { errors: [], warnings: [], failures: [] });
		for (const [path, issues] of Object.entries(outcome.issues)) {
			for (const raised of issues) {
				at(path)[raised.severity === 'warning' ? 'warnings' : 'errors'].push(ruleIssue(raised));
			}
		}
		for (const [path, failures] of Object.entries(outcome.failures))
			at(path).failures.push(...failures.map(failureData));
		for (const [path, fact] of entries(start.native)) {
			if (inScope(path) && !isPathExcluded(start.excluded, path))
				at(path).errors.push(nativeIssue(fact.validity));
		}
		const blocking = Object.values(found).some((entry) => entry.errors.length > 0);
		const failure = Object.values(outcome.failures).flat()[0];
		const unchecked = new Set(outcome.superseded);

		if (!run || !startIndex) {
			if (failure && mode.reject) throw failure;
			const answeredByServer = entries(start.server).some(
				([path]) => inScope(path) && !isPathExcluded(start.excluded, path),
			);
			return !blocking && !answeredByServer && unchecked.size === 0;
		}
		if (tracker.outdated(run)) {
			finish();
			if (mode.submission) mode.submission.outcome = 'overtaken';
			return false;
		}

		const now = (path: string): string | undefined => resolveAnchor(anchorOf(start.ids, path), state.ids);
		const movedSince = (path: string): boolean => {
			const current = now(path);
			return current === undefined || !Object.is(readAt(state.values, current), readAt(start.values, path));
		};
		const factMoved = (path: string, current: string): boolean =>
			selfAt(start.native, path) !== selfAt(state.native, current);
		const dependencyChanged = (path: string): boolean =>
			startIndex.referencesOf(path).some((reference) => {
				const current = now(path);
				if (current === undefined) return true;
				return !Object.is(
					readAt(state.values, resolveFieldRef(reference, current)),
					readAt(start.values, resolveFieldRef(reference, path)),
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
						(isStructural(readAt(start.values, above)) && !isStructural(readAt(state.values, current)))
					);
				});
		const outrun = (path: string, current: string): boolean =>
			lostContainer(path) ||
			movedSince(path) ||
			tracker.superseded(run, current, (anchor) => resolveAnchor(anchor, state.ids)) ||
			dependencyChanged(path);
		const stale = (path: string, current: string | undefined): boolean =>
			current === undefined || outrun(path, current) || factMoved(path, current);
		const plannedSet = new Set(planned);
		const decided = [
			...new Set([
				...planned,
				...entries(start.validation)
					.map(([path]) => path)
					.filter(inScope),
				...Object.keys(found),
			]),
		].map((path) => ({ path, current: now(path) }));
		const excludedNow = (current: string): boolean => isPathExcluded(state.excluded, current);
		const exclusionChanged =
			start.exclusionVersion !== state.exclusionVersion &&
			(!names ||
				[...start.excluded, ...state.excluded].some((path) =>
					names.some((name) => isWithin(path, name) || isWithin(name, path)),
				));
		const scopeStale = (): boolean =>
			changedPaths(start.values, state.values).some(
				(changed) => !names || names.some((name) => isWithin(changed, name) || isWithin(name, changed)),
			) ||
			startIndex.watched.some(
				(watched) =>
					!Object.is(readAt(state.values, watched), readAt(start.values, watched)) &&
					startIndex.dependentsOf(watched).some(inScope),
			);
		const overtaken =
			unchecked.size > 0 ||
			exclusionChanged ||
			scopeStale() ||
			decided.some(
				({ path, current }) => (current === undefined || !excludedNow(current)) && stale(path, current),
			);
		if (mode.retry && overtaken) {
			return batch(() => {
				const again = names?.map((name) => now(name));
				finish();
				if (again?.some((name) => name === undefined)) {
					if (mode.submission) mode.submission.outcome = 'overtaken';
					return Promise.resolve(false);
				}
				return runValidation(again as string[] | undefined, { ...mode, retry: false });
			});
		}

		let validation = state.validation;
		let validated = state.validated;
		const askAgain: string[] = [];
		for (const { path, current } of decided) {
			if (current === undefined || excludedNow(current) || unchecked.has(path)) continue;
			if (stale(path, current)) {
				if (!mode.reject && factMoved(path, current) && !outrun(path, current)) askAgain.push(current);
				continue;
			}
			const entry = found[path] as PathFindings | undefined;
			validation = setSelfAt(
				validation,
				current,
				reuseFinding(
					selfAt(validation, current),
					entry?.errors ?? NO_ISSUES,
					entry?.warnings ?? NO_ISSUES,
					entry?.failures ?? [],
				),
				isArrayNow,
			);
			if (plannedSet.has(path)) validated = setSelfAt(validated, current, true, isArrayNow);
		}
		let failed = state.failed;
		if (mode.markFailed && blocking) {
			failed = names
				? names.reduce((tree, name) => {
						const current = now(name);
						return current === undefined ? tree : markAt(tree, current, isArrayNow);
					}, failed)
				: setSelfAt(failed, '', true, isArrayNow);
		}
		finish({ validation, validated, failed });
		if (askAgain.length > 0) validateQuietly(askAgain, { record: true, markFailed: false, exact: true });
		if (overtaken) {
			if (mode.submission) mode.submission.outcome = 'overtaken';
			return false;
		}
		if (failure && mode.reject) throw failure;
		const scopeNow = names?.flatMap((name) => now(name) ?? []);
		const stillInScope = (path: string): boolean =>
			!scopeNow || (mode.exact ? scopeNow.includes(path) : scopeNow.some((name) => isWithin(path, name)));
		const passed = !blocking && !Object.keys(derive(state).errors).some(stillInScope);
		if (passed && mode.submission && mode.submission.epoch === tracker.epoch()) {
			mode.submission.values = start.values;
			mode.submission.ids = start.ids;
		}
		if (mode.submission) mode.submission.outcome = passed ? 'passed' : 'invalid';
		return passed;
	}

	let cachedIndex: { ids: State['ids']; shape: string; index: DependencyIndex } | undefined;

	/**
	 * The dependency index for the form's rows in `current`.
	 *
	 * @remarks
	 * The index depends on the elements, which never change, and on how many rows each array has, so it
	 * is rebuilt only when that row count signature changes. Writing a value, moving rows or adopting
	 * ids leaves it as it was; the signature is not even computed while the row ids are the same tree.
	 */
	function dependencyIndex(current: State = state): DependencyIndex {
		if (cachedIndex && cachedIndex.ids === current.ids) return cachedIndex.index;
		const lengths = flatRowIds(current);
		const shape = Object.keys(lengths)
			.map((path) => `${path}:${lengths[path].length}`)
			.toSorted()
			.join('|');
		if (cachedIndex?.shape === shape) {
			cachedIndex = { ...cachedIndex, ids: current.ids };
			return cachedIndex.index;
		}
		const index = buildDependencyIndex(elements, toPlain(current.values) as Record<string, unknown>, registry);
		cachedIndex = { ids: current.ids, shape, index };
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
	 * A rule that could not run is recorded by the check itself; what can still reject is a bug in the
	 * validation, which is logged.
	 */
	function afterChange(
		previousValues: NullMap,
		changedPath: string,
		exact: boolean,
		events: { readonly change: boolean; readonly blur: boolean } = { change: true, blur: false },
	): void {
		const names = new Set(dependentsOfChange(previousValues));
		const validatesSelf =
			(events.change && validatesOn('change', changedPath)) || (events.blur && validatesOn('blur', changedPath));
		if (validatesSelf && !exact) names.add(changedPath);
		const quiet = { record: true, markFailed: false } as const;
		if (names.size > 0) validateQuietly([...names], quiet);
		if (validatesSelf && exact) validateQuietly([changedPath], { ...quiet, exact });
	}

	/** What a host set no longer describes the value at `path`, or the paths around it, once it changed. */
	function dropHostErrors(path: string, includeBelow: boolean): Tree<ServerEntry> {
		const around = clearAround(state.server, path);
		return includeBelow ? clearAt(around, path) : clearSelfAt(around, path);
	}

	/**
	 * Writes a control's value, native fact and touch as one command, for `setValue` and `blur`.
	 *
	 * @remarks
	 * A path must name rows its arrays have: rows are made with `fieldArray`, so a write cannot leave holes
	 * or rows without an id. What a change calls for runs after the one commit.
	 */
	function write(
		command: 'setValue' | 'blur',
		path: string,
		input: { readonly has: boolean; readonly value?: unknown },
		nativeOptions: NativeOptions | undefined,
		touch: boolean,
	): void {
		assertFieldPath(path, command);
		const missing = missingRow(path, state.values);
		if (missing) {
			throw new Error(
				`${command}: '${path}' names row '${missing.segment}' of '${missing.above}', which has ${missing.length} rows; add rows with fieldArray.`,
			);
		}
		const previousValues = state.values;
		const branch = input.has
			? reconcile(readAt(previousValues, path), toInternal(input.value))
			: readAt(previousValues, path);
		const values = input.has ? setIn(previousValues, path, branch) : previousValues;
		const valueChanged = values !== previousValues;
		if (command === 'setValue' && !valueChanged) return;
		const native = withFact(
			valueChanged ? stable(state.native, conformAt(state.native, path, branch)) : state.native,
			path,
			nativeOptions?.native,
			values,
		);
		const factChanged = native !== state.native;
		if (!touch && !valueChanged && !factChanged) return;
		const touched = valueChanged
			? (touch ? markAt : (tree: Tree<true>) => tree)(
					conformAt(state.touched, path, branch),
					path,
					arrayIn(values),
				)
			: touch
				? markAt(state.touched, path, arrayIn(values))
				: state.touched;
		const root = path.split('.')[0];
		batch(() => {
			commit({
				values,
				native,
				touched,
				...(valueChanged
					? {
							ids: replaceIdsAt(
								state.ids,
								root,
								syncIds(idsAt(state.ids, root), readAt(values, root), mintId),
							),
							server: dropHostErrors(path, true),
							validation: conformAt(state.validation, path, branch),
							failed: conformAt(state.failed, path, branch),
							validated: conformAt(state.validated, path, branch),
							validating: conformAt(state.validating, path, branch),
						}
					: {}),
			});
			afterChange(previousValues, path, false, { change: valueChanged || factChanged, blur: touch });
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
	 * Each state tree has one element per row, so a row's errors, native facts, touched marks, checks and
	 * pending marks are carried by moving the element; a row the operation adds has none.
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
		batch(() => {
			commit({
				values,
				ids: replaceIdsAt(placed, root, syncIds(idsAt(placed, root), readAt(values, root), mintId)),
				server: reorderAt(dropHostErrors(path, false), path, order),
				validation: reorderAt(state.validation, path, order),
				native: reorderAt(state.native, path, order),
				touched: reorderAt(state.touched, path, order),
				failed: reorderAt(state.failed, path, order),
				validated: reorderAt(state.validated, path, order),
				validating: reorderAt(state.validating, path, order),
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

	let latestSubmission: Submission | undefined;

	/** Whether the target of a server error, and the values its path's rules read, are as they were when the submission began. */
	function targetUnchanged(record: SubmissionRecord, was: string, now: string, index: DependencyIndex): boolean {
		if (was === '') return Object.is(record.values, state.values);
		if (!Object.is(readAt(record.values, was), readAt(state.values, now))) return false;
		return index
			.referencesOf(now)
			.every((reference) =>
				Object.is(
					readAt(record.values, resolveFieldRef(reference, was)),
					readAt(state.values, resolveFieldRef(reference, now)),
				),
			);
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
		setValue: (path, value, nativeOptions) => write('setValue', path, { has: true, value }, nativeOptions, false),
		blur: (path, blurOptions) =>
			write(
				'blur',
				path,
				{ has: blurOptions !== undefined && Object.hasOwn(blurOptions, 'value'), value: blurOptions?.value },
				blurOptions,
				true,
			),
		reportNative(path, reported) {
			assertFieldPath(path, 'reportNative');
			if (!holds(path, state.values)) return;
			const native = withFact(state.native, path, reported, state.values);
			if (native === state.native) return;
			batch(() => {
				commit({ native });
				if (hasMarkAround(state.validated, path) || isFailed(path)) {
					validateQuietly([path], { record: true, markFailed: false });
				}
			});
		},
		reset(values) {
			const defaults = values ? (toInternal(values) as NullMap) : state.defaults;
			tracker.reset();
			latestSubmission = undefined;
			commit({
				values: defaults,
				defaults,
				validation: undefined,
				server: undefined,
				native: undefined,
				touched: undefined,
				failed: undefined,
				validated: undefined,
				validating: undefined,
				ids: syncIds(undefined, defaults, mintId),
			});
		},
		async validate(paths, validateOptions) {
			return batch(() => {
				if (validateOptions?.native) {
					const facts = flushedFacts(state.native, validateOptions.native, state.values);
					if (facts !== state.native) commit({ native: facts });
				}
				const token = validateOptions?.submission;
				const record = Submission.recordOf(token);
				const submission = record && token === latestSubmission ? record : undefined;
				if (record) record.outcome = submission ? undefined : 'overtaken';
				if (submission && paths?.length === 0) {
					submission.values = state.values;
					submission.ids = state.ids;
					submission.outcome = 'passed';
					return Promise.resolve(true);
				}
				return runValidation(paths, { record: true, markFailed: true, retry: true, reject: true, submission });
			});
		},
		checkValidity: async (paths, checkOptions) =>
			runValidation(paths, {
				record: false,
				markFailed: false,
				reject: true,
				facts: checkOptions?.native
					? { tree: flushedFacts(state.native, checkOptions.native, state.values) }
					: undefined,
			}),
		beginSubmission() {
			const token = new Submission({
				outcome: undefined,
				values: state.values,
				ids: state.ids,
				epoch: tracker.epoch(),
			});
			latestSubmission = token;
			commit({ server: undefined });
			return token;
		},
		setErrors(source, errors, setOptions) {
			if (!HOST_SOURCES.includes(source)) {
				throw new Error(`Unknown error source '${String(source)}': a host sets ${HOST_SOURCES.join(', ')}.`);
			}
			const token = setOptions?.submission;
			const record = Submission.recordOf(token);
			const given = Object.entries(errors).map(([path, input]) => {
				if (path !== FORM_ROOT) assertFieldPath(path, 'setErrors');
				assertRowsExist(path, record?.values ?? state.values);
				return [path, serverIssues(input)] as const;
			});
			if (token && (!record || token !== latestSubmission || record.epoch !== tracker.epoch())) return;
			const index = dependencyIndex();
			const known = state.server;
			const applied: Array<[string, ServerEntry]> = [];
			for (const [path, issues] of given) {
				if (issues.length === 0) continue;
				const was = internalPath(path);
				const where = record ? resolveAnchor(anchorOf(record.ids, was), state.ids) : was;
				if (where === undefined || (record && !targetUnchanged(record, was, where, index))) continue;
				const dependencies = where === '' ? [] : dependenciesOf(where, state.values, index);
				const previous = selfAt(known, where);
				const kept = reuseIssues(previous?.issues, issues);
				applied.push([
					where,
					previous &&
					previous.issues === kept &&
					previous.dependencies.length === dependencies.length &&
					previous.dependencies.every(
						(one, position) =>
							one.reference === dependencies[position].reference &&
							Object.is(one.value, dependencies[position].value),
					)
						? previous
						: { issues: kept, dependencies },
				]);
			}
			commit({ server: stable(known, fromEntries(applied, isArrayNow)) });
		},
		fieldArray,
	};
}
