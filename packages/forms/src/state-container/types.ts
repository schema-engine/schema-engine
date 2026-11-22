import type { ValidationElementTree } from '@/engine/value-validation';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry';
import type { FieldArrayCommands } from './field-array';

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
 * {@link FormStateContainer.blur}, reports the control's native validity with
 * {@link FormStateContainer.reportNative}, and submits with {@link FormStateContainer.submit}, whose result
 * carries the way to hand back the server's answer.
 *
 * The container is named for what it holds, not `FormStore`, which is a class of Radiant UI. Internal
 * until both renderer bindings run on it. Nothing here is exported from a package entry point.
 */

/**
 * The key of an error about the form itself rather than a field, in `snapshot.errors` and in `setServerErrors`.
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
 * built from, serializable (`{ minLength: 8 }` for a rule, `{ minLength: 8 }` for a native control).
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
 * Why a submission as a whole failed, in the shape of an issue, so a host words it with the one formatter.
 *
 * @remarks
 * It is not a {@link FormStateIssue}: a submission failure (the action that threw, the callback that
 * rejected, the service that was down) concerns no field and the snapshot never holds one. `type` names the
 * failure for a program, `params` fill the text, and `message` is only the text the failure itself carried.
 */
export interface FormSubmissionIssue {
	readonly type: string;
	readonly source: 'submission';
	readonly params?: Readonly<Record<string, unknown>>;
	readonly message?: string;
}

/**
 * Turns an issue into the text to show, for the field at `field.path`.
 *
 * @remarks
 * The one seam between the engine, which reports what is wrong (`type`, `ruleId`, `params`), and the text
 * of the application's language, which the engine does not own. A binding takes one from its host and
 * calls it for the issue to show (an error or warning is itself an issue) and for each of `all` it lists,
 * falling back to `issue.message` when the host gives none or the formatter returns nothing worth showing.
 * `ruleId` picks a text of one rule, `type` a text of a kind of rule, and `params` fill its numbers. The
 * action context and the bindings use this same issue type, so one formatter serves them all. A
 * {@link FormSubmissionIssue} goes through it too, with the path of the form ({@link FORM_ROOT}).
 */
export type FormIssueFormatter = (
	issue: FormStateIssue | FormSubmissionIssue,
	field: { readonly path: string },
) => string;

/**
 * An issue as a caller of `setServerErrors` may give it.
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

/** What `setServerErrors` takes: one issue or a list of them for each path. */
export type FormStateErrorsInput = Readonly<Record<string, FormStateErrorInput | readonly FormStateErrorInput[]>>;

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
 * How a submission ended, and what the host may do next.
 *
 * @remarks
 * `'passed'`: the scope was current and nothing blocks; `values` are exactly the values that passed, frozen,
 * nested like `snapshot.values`, without the paths that took no part and with the config's `payload`. An
 * edit during the check followed by a retry that passes leaves the edit in them. `setServerErrors` hands back
 * the server's answer to that submission. `'invalid'`: the scope was current and an error blocks, so show the
 * errors and focus. `'overtaken'`: an edit, a row move, a reset, a later submission or a superseded check outran
 * it, so there is no verdict on anything: ask again, and do not show errors the user did not cause.
 */
export type FormSubmitResult =
	| {
			readonly outcome: 'passed';
			readonly values: Readonly<Record<string, unknown>>;
			/**
			 * Shows the server's answer to this submission, replacing the answer shown so far.
			 *
			 * @remarks
			 * Each path takes one issue or a list, and {@link FORM_ROOT} stands for the form. Throws for a path with
			 * a reserved `__` segment other than `FORM_ROOT`, and for a path that names a row the submitted values
			 * did not have. Index paths are the ones of `values`: an error for submitted `contacts.0.email` lands
			 * on that row wherever it is now, and is dropped when the row is gone. An error is applied only when its
			 * target, and every value its rules read, are unchanged since the submission, and only while this is the
			 * latest submission and no reset came between: otherwise the call does nothing. An error is cleared
			 * when its path, or a path its rules read, is edited.
			 */
			readonly setServerErrors: (errors: FormStateErrorsInput) => void;
	  }
	| { readonly outcome: 'invalid' }
	| { readonly outcome: 'overtaken' };

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
 * from `errors`, `warnings` and `validating`.
 */
export interface FormStateSnapshot {
	/** The nested value tree. */
	readonly values: Readonly<Record<string, unknown>>;
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
	/**
	 * Replaces the whole branch at `path`.
	 *
	 * @remarks
	 * Throws for a path with a reserved segment (one that starts with `__`, or `constructor`, `prototype`, `__proto__`) and for a path that names a row its array does not
	 * have: rows are made with `fieldArray`, so a write cannot leave holes or rows without an id. It is a change: it validates when the mode says so, re-validates dependents, and drops what describes
	 * a value that is gone: the errors a server answered with at the path and below, and on the paths around it, the form included,
	 * and the native facts of the value. The state of rows and objects the branch no longer holds is dropped with
	 * them. A write that leaves the value as it is changes nothing.
	 */
	setValue(path: string, value: unknown): void;
	/**
	 * Marks `path` touched, and validates it when the mode says so.
	 *
	 * @remarks
	 * The path is checked as in `setValue`. A control whose value the host has not written yet is written with
	 * `setValue` first: the two are separate commands, and the end state is the one a single command would
	 * leave.
	 */
	blur(path: string): void;
	/**
	 * Reports what the platform's controls say about the values the container holds, with no input from the user.
	 *
	 * @remarks
	 * The one channel for native validity, for a host that owns controls: a path with its fact, `null` for a
	 * control that reports itself valid or goes away, which withdraws the fact. A host reports a fact on a
	 * change, a blur, a reset, or when a control's constraints change, and withdraws it when its control
	 * disconnects. A fact is bound to the value held now and is dropped when that value changes, and it moves with
	 * its row. A fact that is already held is a no-op. Reporting is no change: nothing becomes dirty or touched,
	 * and one call is one commit that re-validates, in a single run, only the changed paths that were validated
	 * before, are in a failed scope, or have a check in flight, never to start validating a pristine one. A path the
	 * container does not hold (a removed row, an absent object) is ignored. A reserved path throws, for the whole
	 * call and before anything is written. A fact is not part of the snapshot, so reporting alone notifies nobody.
	 */
	reportNative(facts: Readonly<Record<string, NativeValidity | null>>): void;
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
	 */
	validate(paths?: readonly string[]): Promise<boolean>;
	/**
	 * Whether the form is valid for the state at the moment of the call, by the same count as `validate`, without its writes.
	 *
	 * @remarks
	 * It answers for the values, native facts, server errors and participation current when it was called,
	 * and for no later state: it is never retried and never mixes those with errors set afterwards, so the
	 * answer may already be out of date when it resolves. It writes no error and
	 * changes no state. Errors recorded earlier do not count, as the check validates afresh. It rejects with
	 * a `FormValidationFailure`, which keeps the `reason` and the `cause`, when a rule could not run.
	 */
	checkValidity(): Promise<boolean>;
	/**
	 * Submits the form: clears the server's answer to the last submission, validates the whole form and says how that ended.
	 *
	 * @remarks
	 * It validates as `validate()` does, with the same freshness and the one retry over the same rows, and
	 * captures the submission the result speaks for: a later `submit` or a `reset` supersedes it, and the
	 * earlier one ends `'overtaken'` or has its `setServerErrors` ignored. Like `validate`, it rejects with a
	 * `FormValidationFailure` when a rule could not run, and a rejected call is no outcome.
	 */
	submit(): Promise<FormSubmitResult>;
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

/** What {@link createFormStateContainer} reads from a normalized form config. */
export interface FormStateContainerConfig {
	/** The steps whose elements make up the form: fields, rules and constraints. */
	readonly steps: ReadonlyArray<{ readonly elements: ValidationElementTree }>;
	/** When a field validates before a check of it has failed; the config schema always fills it. */
	readonly validationMode: FormValidationMode;
	/** When a field validates once a check of it has run; the config schema always fills it. */
	readonly reValidateMode: FormReValidateMode;
	/**
	 * Data that travels with every submission.
	 *
	 * @remarks It is merged into the `values` of a passed submission and is never a value of the form: not in the snapshot, not dirty, not validated. Its keys cannot name fields, which the config validation checks.
	 */
	readonly payload?: Readonly<Record<string, unknown>>;
}

/** What {@link FormStateContainerFactory} builds a container from. */
export interface FormStateContainerOptions {
	/** The normalized form config: the elements, the validation timing and the payload all come from it, so no renderer can differ. */
	readonly config: FormStateContainerConfig;
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
}

/** What `formStateContainerConformance` builds the container under test with. */
export type FormStateContainerFactory = (options: FormStateContainerOptions) => FormStateContainer;
