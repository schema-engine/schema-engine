import type { ValidationElementTree } from '@/engine/value-validation';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry';
import type { FieldArrayCommands } from './field-array';
import type { FormFieldState } from './selectors';

/**
 * The internal form state contract: what a form's state container owns, and what it leaves to others.
 *
 * @remarks
 * The container owns the nested value tree, field state (errors, touched, dirty), field-array row ids and
 * the atomic updates that keep them consistent. A path is a plain dotted path with the row index in it
 * (`contacts.1.email`) wherever the API takes one, and {@link FORM_ROOT} names the form itself. It holds
 * no submission state (`isSubmitting`, `submitCount`, a submit guard): the runtime owns those. Focus,
 * native controls and native submit belong to the host, and there is no control registration: a host
 * bridges a control into the container with {@link FormStateContainer.setValue} and
 * {@link FormStateContainer.blur}, which carry the control's native validity, and flushes it with
 * {@link FormStateContainer.validate} and {@link FormStateContainer.checkValidity}; a server's answer goes
 * through {@link FormStateContainer.setErrors}.
 *
 * The container is named for what it holds, not `FormStore`, which is a class of Radiant UI. Internal
 * until both renderer bindings run on it. Nothing here is exported from a package entry point.
 */

/**
 * The key of an error about the form itself rather than a field, in `snapshot.errors` and in `setErrors`.
 *
 * @remarks Path segments that start with `__` are reserved, so no field can have this name.
 */
export const FORM_ROOT = '__root__';

/**
 * When a field validates before a check of it has failed: on `change`, on `blur`, on both (`all`), on the
 * first `blur` and on every change after it (`onTouched`, as React Hook Form's mode of that name) or only on
 * an explicit {@link FormStateContainer.validate}.
 */
export type FormValidationMode = 'onSubmit' | 'onChange' | 'onBlur' | 'onTouched' | 'all';

/** When a field validates once a {@link FormStateContainer.validate} over it has failed. */
export type FormReValidateMode = 'onSubmit' | 'onChange' | 'onBlur';

/** Who reported an issue. */
export type FormStateSource = 'server' | 'validation' | 'native';

/**
 * One thing wrong with a path, who said so, and what a translation needs to say it.
 *
 * @remarks
 * `type` names the problem for a program: the rule's type (`'minLength'`), the `ValidityState` flag of a
 * native control (`'typeMismatch'`) or the server's code. `ruleId` is the author's stable name for the
 * rule, so two `pattern` rules stay distinguishable. `params` are the numbers and names the text is
 * built from, serializable (`{ value: 8 }` for a rule, `{ minLength: 8 }` for a native control).
 * `message` is only the text the author wrote on the rule, or the server or control sent, for a host with no
 * translation of the issue, and may be absent. Text the schema library would make up is never used.
 */
export interface FormStateIssue {
	readonly type: string;
	readonly source: FormStateSource;
	readonly ruleId?: string;
	readonly params?: Readonly<Record<string, unknown>>;
	readonly message?: string;
}

/**
 * The error of a path: the issue to show, and every issue the path has.
 *
 * @remarks
 * The fields of the issue are those of `all[0]`, so the error reads like a single issue, and `all` is
 * never empty. `all` lists, in this order, what the server said, then each rule the value fails in
 * authored order (never the order the checks finished in), then what the platform's own control reports.
 * The same error object comes back while none of that changes.
 */
export interface FormStateError extends FormStateIssue {
	readonly all: readonly FormStateIssue[];
}

/**
 * Advice about a path: shaped and timed exactly like an error, and never blocking.
 *
 * @remarks
 * It comes from rules declared with `severity: 'warning'`, so its issues have the source `'validation'`.
 * It never affects `isValid`, `validate` or `checkValidity`. A server cannot send warnings yet.
 */
export type FormStateWarning = FormStateError;

/**
 * Turns an issue into the text to show, for the field at `field.path`.
 *
 * @remarks
 * The one seam between the engine, which reports what is wrong (`type`, `ruleId`, `params`), and the text
 * of the application's language, which the engine does not own. A binding takes one from its host and
 * calls it for the issue to show (an error or warning is itself an issue) and for each of `all` it lists,
 * falling back to `issue.message` when the host gives none or the formatter returns nothing worth showing.
 * `ruleId` picks a text of one rule, `type` a text of a kind of rule, and `params` fill its numbers. The
 * action context and the bindings use this same issue type, so one formatter serves them all.
 */
export type FormIssueFormatter = (issue: FormStateIssue, field: { readonly path: string }) => string;

/**
 * A rule that could not run, as a snapshot keeps it: data, with no error object to retain.
 *
 * @remarks `validate` and `checkValidity` reject with the `FormValidationFailure` itself, which keeps the cause.
 */
export interface FormStateFailure {
	readonly path: string;
	readonly ruleType: string;
	readonly ruleId?: string;
}

/**
 * An issue as a caller of {@link FormStateContainer.setErrors} may give it.
 *
 * @remarks
 * Every part is optional, as a server response may carry only a code or only a message. A missing `type`
 * is kept as `'server'`. An issue with nothing but a type still counts as an error: it blocks
 * {@link FormStateContainer.validate}.
 */
export interface FormStateErrorInput {
	readonly type?: string;
	readonly params?: Readonly<Record<string, unknown>>;
	readonly message?: string;
}

/** What {@link FormStateContainer.setErrors} takes: one issue or a list of them for each path. */
export type FormStateErrorsInput = Readonly<Record<string, FormStateErrorInput | readonly FormStateErrorInput[]>>;

/**
 * Who reports an error a host sets.
 *
 * @remarks
 * A host sets `server` errors, which describe the response to one submission: {@link FormStateContainer.beginSubmission}
 * clears the source, and an edit clears the errors of the path it changes and of the paths whose rules
 * read it. `validation` is the container's own, and `native` is the platform's, which a host reports with
 * the input that produced it ({@link NativeOptions}) rather than as an error.
 */
export type FormErrorSource = 'server';

/**
 * What a platform control reports about its value.
 *
 * @remarks
 * `type` is the `ValidityState` flag (`'valueMissing'`, `'typeMismatch'`, `'tooShort'`), `params` the
 * constraint behind it that a text needs (`{ minLength: 8 }`, `{ pattern: '[0-9]+' }`), `message` the
 * control's own text, a fallback only.
 */
export interface NativeValidity {
	readonly type: string;
	readonly params?: Readonly<Record<string, unknown>>;
	readonly message?: string;
}

/**
 * The native fact that travels with an input.
 *
 * @remarks
 * Absent leaves the facts as they are. `null` says the control reports itself valid, which withdraws
 * its fact. A fact describes the value the control had when it reported: it is dropped as soon as that
 * value changes, so a later write without a fact never reuses an old one.
 */
export interface NativeOptions {
	readonly native?: NativeValidity | null;
}

/**
 * What a platform control reports for each path, as a submit or an action flushes it.
 *
 * @remarks
 * The map is the whole truth for that check: a control that is not in it is not mounted, cannot vouch for
 * its value, and its stored fact is not counted, so the engine's rules alone cover that path. A `null` says
 * the control reports itself valid. Facts for rows that do not exist are ignored.
 */
export interface NativeFlush {
	readonly native?: Readonly<Record<string, NativeValidity | null>>;
}

/** What {@link FormStateContainer.validate} takes besides the paths. */
export interface ValidateOptions extends NativeFlush {
	/** The submission this check is the validation of: when it resolves `true`, the token holds exactly the values it validated. */
	readonly submission?: SubmissionToken;
}

/** What {@link FormStateContainer.blur} takes: the value the control has now, when the host writes it, and its native fact. */
export interface BlurOptions extends NativeOptions {
	/** Written with the blur as one command, so the touch and the value reach subscribers together. */
	readonly value?: unknown;
}

/**
 * How the last `validate(paths, { submission })` of a submission ended.
 *
 * @remarks
 * `'passed'`: the scope was current and nothing blocks; the token holds the values that passed. `'invalid'`:
 * the scope was current and an error blocks, so show the errors and focus. `'overtaken'`: an edit, a row move,
 * a reset or a superseded check outran it, so no verdict on anything: ask again, do not show errors the user
 * did not cause. A call that rejects leaves it unset.
 */
export type SubmissionOutcome = 'passed' | 'invalid' | 'overtaken';

declare const submissionBrand: unique symbol;

/**
 * What {@link FormStateContainer.beginSubmission} returns: the values a submission is about, as the container saw them.
 *
 * @remarks
 * Opaque but for `values`. It holds the values current when the submission began, and each time
 * `validate(paths, { submission })` resolves `true` it holds exactly the values that validation covered:
 * a validation that was overtaken and retried leaves the values of the retry. A runtime submits
 * `submission.values`, which is what passed. A server's answer given with the token is judged against them
 * ({@link FormStateContainer.setErrors}).
 */
export interface SubmissionToken {
	readonly [submissionBrand]: true;
	/** The frozen values of the submission, nested like `snapshot.values`. */
	readonly values: Readonly<Record<string, unknown>>;
	/** How the last validation with this token ended; unset until one has, and while the next is running. */
	readonly outcome: SubmissionOutcome | undefined;
}

/** What {@link FormStateContainer.setErrors} takes besides the errors. */
export interface SetErrorsOptions {
	/** The submission the errors answer; without it they are host errors outside any submission. */
	readonly submission?: SubmissionToken;
}

/**
 * The immutable state a subscriber reads.
 *
 * @remarks
 * Stable: {@link FormStateContainer.getSnapshot} returns the same object until something changes, and a
 * branch that did not change keeps its reference, in `values` and in every map. Maps are plain records,
 * frozen, keyed by dotted path. An opaque value, such as an array holding `File` objects, is kept and
 * compared by reference: it is never copied, frozen or diffed.
 *
 * Paths that take no part in validation (hidden or disabled fields, and what is inside them) are absent
 * from `errors`, `warnings`, `validating` and `validationFailures`.
 */
export interface FormStateSnapshot {
	/** The nested value tree. */
	readonly values: Readonly<Record<string, unknown>>;
	/** The values the form started from, and `reset` restores. */
	readonly defaults: Readonly<Record<string, unknown>>;
	/**
	 * The error of each path, with every issue it has in `all`.
	 *
	 * @remarks
	 * Never inherited: an error on `contacts` is not an error on `contacts.0.email`, and both can be present.
	 * An error about the form itself is at {@link FORM_ROOT}.
	 */
	readonly errors: Readonly<Record<string, FormStateError>>;
	/** The advice of each path, shaped like `errors` and never blocking. */
	readonly warnings: Readonly<Record<string, FormStateWarning>>;
	/** The paths the user has blurred; a mark on a container covers the fields below it. Moves with its row. */
	readonly touched: Readonly<Record<string, true>>;
	/**
	 * The paths whose value differs from the defaults.
	 *
	 * @remarks An array's own mark means its row count changed; its rows are compared by index, so appending a row does not make the existing rows dirty.
	 */
	readonly dirty: Readonly<Record<string, true>>;
	/** The ids of an array's rows, by array path, in row order. */
	readonly rowIds: Readonly<Record<string, readonly string[]>>;
	/**
	 * The paths a check the container started is still running for.
	 *
	 * @remarks
	 * A path is listed while the latest check that asked for it is running: a check overtaken by a later one
	 * for the same path does not keep it pending. Pending is state, never an issue. It moves with its row.
	 */
	readonly validating: Readonly<Record<string, true>>;
	/**
	 * The rules that could not run, by path of the field.
	 *
	 * @remarks
	 * Operational, not a field error: a rule that throws says nothing about the value. An automatic check
	 * records the failure here and keeps the results of the other rules; `validate` and `checkValidity`
	 * reject instead. It does not affect `isValid`, since nothing says the value is wrong, and is replaced
	 * by the next check of the path.
	 */
	readonly validationFailures: Readonly<Record<string, readonly FormStateFailure[]>>;
	/** Whether a validation the container started, other than `checkValidity`, is still running: any path pending, or a superseded run still in flight. */
	readonly isValidating: boolean;
	/** Whether no error from any source is recorded for a path that takes part. Cheap, and not a fresh check. */
	readonly isValid: boolean;
}

/**
 * The commands over a form's state, and the stable reads a binding builds on.
 *
 * @remarks
 * Every command is one atomic update: subscribers are notified once, and never see an array's values
 * and its row state out of step. No member depends on how it is called, so a binding may pass any of
 * them as a callback. Read state with `getSnapshot` and the selectors of `selectors.ts`.
 */
export interface FormStateContainer {
	/** Registers a listener for every snapshot change; returns the function that removes it. */
	subscribe(listener: () => void): () => void;
	getSnapshot(): FormStateSnapshot;
	/** The snapshot to render on the server and during hydration: the initial state, never replaced. */
	getServerSnapshot(): FormStateSnapshot;

	/** The value at a dotted path, from the current state. */
	getValue(path: string): unknown;
	/** `selectFieldState(getSnapshot(), path)`. */
	getFieldState(path: string): FormFieldState;
	/**
	 * Replaces the whole branch at `path`, with the native fact of the control that produced it.
	 *
	 * @remarks
	 * Throws for a path with a reserved segment (one that starts with `__`, or `constructor`, `prototype`, `__proto__`) and for a path that names a row its array does not
	 * have: rows are made with `fieldArray`, so a write cannot leave holes or rows without an id. It is a change: it validates when the mode says so, re-validates dependents, and drops what describes
	 * a value that is gone. Errors a host set with `setErrors` are dropped at the path and below, and the
	 * ones on the paths around it, the form included, as the value they described changed. The state of rows
	 * and objects the branch no longer holds is dropped with them. A write that leaves the value as it is
	 * changes nothing, and the fact it carries is not stored: report a fact alone with `reportNative`.
	 */
	setValue(path: string, value: unknown, options?: NativeOptions): void;
	/**
	 * Marks `path` touched, writes the control's value and records its native fact when given, and validates it when the mode says so.
	 *
	 * @remarks
	 * One command and one notification: with `options.value` the write and the touch are the same update, so
	 * no subscriber sees the value without the mark or the other way round. The path is checked as in
	 * `setValue`.
	 */
	blur(path: string, options?: BlurOptions): void;
	/**
	 * Reports what a control says about the value the container holds at `path`, with no input from the user.
	 *
	 * @remarks
	 * For a control that reports on its own, such as after a reset or when its constraints change. The fact is
	 * bound to the value held now, and `null` withdraws it. It is no change: nothing becomes dirty or touched,
	 * and it validates a path only when that path was validated before or is in a failed scope, never to start
	 * validating a pristine one. A path the container does not hold (a removed row, an absent object) is ignored.
	 * A reserved path throws.
	 */
	reportNative(path: string, native: NativeValidity | null): void;
	/**
	 * Replaces the defaults with `values` when given, then restores the values to the defaults and clears
	 * every error, native fact, touched and dirty mark and the failed-check state.
	 *
	 * @remarks Validation still running when this is called is dropped and not run again, and so are the submissions begun before it; every row gets a new id.
	 */
	reset(values?: Record<string, unknown>): void;
	/**
	 * Validates `paths` (the whole form when omitted, nothing when empty), records the findings and resolves whether it passed.
	 *
	 * @remarks
	 * Every check records the scope it covered: the values it read, the values its rules depend on, the
	 * native facts, the reset generation and the rows by id. It resolves `true` only when no error from any
	 * source remains at the paths that take part and that scope was still current when it finished. A check
	 * overtaken by an edit, a row move or a reset runs once more over the same rows, wherever they are now,
	 * and one that is overtaken again, or whose rows are gone, resolves `false` without writing anything stale.
	 * It rejects with a `FormValidationFailure` naming the path and rule when a rule could not run. A failure
	 * of its own validation starts the failed-check state for those paths, so they re-validate by
	 * `reValidateMode` from then on. It does not mark anything submitted or touched.
	 *
	 * `options.native` is the flush of a submit: a fact for each control, and the whole truth. It replaces
	 * the facts the container holds, so a control that is not in the map, being unmounted, is not counted
	 * and its rules alone cover it. Facts for rows that do not exist are ignored.
	 *
	 * With `options.submission`, a result of `true` leaves the token holding exactly the values this
	 * validation covered, from the run that resolved, so the values a runtime submits are the ones that
	 * passed: an edit during the check, followed by a retry that passes, submits the edit.
	 */
	validate(paths?: readonly string[], options?: ValidateOptions): Promise<boolean>;
	/**
	 * Whether `paths` (the whole form when omitted) is valid for the state at the moment of the call, by the same count as `validate`, without its writes.
	 *
	 * @remarks
	 * It answers for the values, native facts, server errors and participation current when it was called,
	 * and for no later state: it is never retried and never mixes those with errors set afterwards, so the
	 * answer may already be out of date when it resolves. It writes no error and
	 * changes no state, and `options.native`, a flush as in `validate`, is used for this call only. Errors recorded earlier do not count, as the check validates afresh. It rejects with
	 * a `FormValidationFailure` when a rule could not run.
	 */
	checkValidity(paths?: readonly string[], options?: NativeFlush): Promise<boolean>;
	/**
	 * Starts a submission: captures the values it is about and clears the errors of the `server` source.
	 *
	 * @remarks
	 * The token ties the server's answer to what was submitted, see {@link FormStateContainer.setErrors},
	 * and `validate(paths, { submission })` leaves it holding the values that passed. A later
	 * `beginSubmission` supersedes it, and so does `reset`.
	 */
	beginSubmission(): SubmissionToken;
	/**
	 * Replaces the errors one source reports, by dotted path (`FORM_ROOT` for the form); an empty map clears the source.
	 *
	 * @remarks
	 * Each path takes one issue or a list. Throws for a source a host cannot set, for a path with a reserved
	 * `__` segment other than `FORM_ROOT`, and for a path that names a row an array does not have; a path
	 * below an object that is merely absent is allowed. Writing identical errors changes nothing and
	 * notifies nobody.
	 *
	 * With `options.submission` the answer is applied to what it was about. Index paths are the ones of the
	 * submitted values: an error for submitted `contacts.0.email` lands on that row wherever it is now, and
	 * is dropped when the row is gone. An error is applied only when its target, and every value its rules
	 * read, are unchanged since the values of the submission (`submission.values`). A token from before a reset or from a superseded
	 * submission is ignored. Without a token the errors are the host's, outside any submission, and apply
	 * as they are. Either way an error is cleared when its path or a path its rules read is edited.
	 */
	setErrors(source: FormErrorSource, errors: FormStateErrorsInput, options?: SetErrorsOptions): void;
	/**
	 * The commands of the array at `path`, the same object each time.
	 *
	 * @remarks
	 * Cached per path, and a path names a position: `contacts.0.phones` is whatever row is at index 0 now,
	 * not the row that was there when the commands were first asked for. Rows are read from
	 * `snapshot.rowIds[path]`; `toFieldArrayValue` combines the two for a widget.
	 */
	fieldArray(path: string): FieldArrayCommands;
}

/** What {@link FormStateContainerFactory} builds a container from. */
export interface FormStateContainerOptions {
	readonly elements: ValidationElementTree;
	readonly registry: ValidationRegistry;
	readonly defaults?: Record<string, unknown>;
	/**
	 * The `rowIds` of a snapshot rendered elsewhere, to adopt for the arrays it names.
	 *
	 * @remarks
	 * Ids the container mints are deterministic: they follow the walk order of the defaults with one counter
	 * per container, so a client built from the same defaults as the server already matches it. This is for a
	 * server that rendered state other than the defaults. An entry whose count differs from the rows is not
	 * adopted, and a warning says so.
	 */
	readonly rowIds?: Readonly<Record<string, readonly string[]>>;
	/** @defaultValue `'onSubmit'` */
	readonly validationMode?: FormValidationMode;
	/** @defaultValue `'onChange'` */
	readonly reValidateMode?: FormReValidateMode;
}

/** What `formStateContainerConformance` builds the container under test with. */
export type FormStateContainerFactory = (options: FormStateContainerOptions) => FormStateContainer;
