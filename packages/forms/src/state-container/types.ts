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
 * bridges a control into the container with {@link FormStateContainer.setValue},
 * {@link FormStateContainer.blur} and {@link FormStateContainer.setErrors}.
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

/** When a field validates: on `change`, on `blur`, on both (`all`) or only on an explicit {@link FormStateContainer.validate}. */
export type FormValidationMode = 'onSubmit' | 'onChange' | 'onBlur' | 'all';

/** When a field validates once a {@link FormStateContainer.validate} over it has failed. */
export type FormReValidateMode = 'onSubmit' | 'onChange' | 'onBlur';

/** Who reported an issue. */
export type FormStateSource = 'server' | 'validation' | 'native';

/** One thing wrong with a path, and who said so. */
export interface FormStateIssue {
	readonly type: string;
	readonly message: string;
	readonly source: FormStateSource;
}

/**
 * The error of a path: the issue to show, and every issue the path has.
 *
 * @remarks
 * `type`, `message` and `source` are those of `all[0]`, so the error reads like a single issue. `all`
 * lists, in this order, what the server said, then each rule the value fails in rule order, then what the
 * platform's own control reports. The same error object comes back while none of that changes.
 */
export interface FormStateError extends FormStateIssue {
	readonly all: readonly FormStateIssue[];
}

/**
 * An error as a caller of {@link FormStateContainer.setErrors} may give it.
 *
 * @remarks
 * Both parts are optional, as a server response may carry only one. The container keeps a missing `type`
 * as `'server'` and a missing `message` as an empty string, so an issue is always whole and `undefined`
 * never reaches a field. An error with an empty message still counts as an error: it blocks
 * {@link FormStateContainer.validate}.
 */
export interface FormStateErrorInput {
	readonly type?: string;
	readonly message?: string;
}

/**
 * Who reports an error a host sets.
 *
 * @remarks
 * A host sets `server` errors, which describe the response to the last submission: the runtime clears the
 * source at the start of each submission, before it validates, and an edit clears the errors at the path
 * it changes. `validation` is the container's own, and `native` is the platform's, which a host reports
 * through {@link FormStateContainer.setNativeValidity} as input to validation rather than as an error.
 * Where sources report one path, the issues are listed server, validation, native, and the first is shown.
 */
export type FormErrorSource = 'server';

/**
 * What a platform control reports about its value, such as a `ValidityState` flag.
 *
 * @remarks `type` is the flag (`'valueMissing'`, `'typeMismatch'`); `message` is the control's own message when it has one.
 */
export interface NativeValidity {
	readonly type: string;
	readonly message?: string;
}

/**
 * The immutable state a subscriber reads.
 *
 * @remarks
 * Stable: {@link FormStateContainer.getSnapshot} returns the same object until something changes, and a
 * branch that did not change keeps its reference, in `values` and in every map. Maps are plain records,
 * frozen, keyed by dotted path. An opaque value, such as an array holding `File` objects, is kept and
 * compared by reference: it is never copied, frozen or diffed.
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
	/** Whether a validation the container started, other than `checkValidity`, is still running. */
	readonly isValidating: boolean;
	/** Whether no error from any source is recorded. */
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
	 * Replaces the whole branch at `path`.
	 *
	 * @remarks
	 * It is a change: it validates when the mode says so, re-validates dependents, and drops what describes
	 * a value that is gone. Errors a host set with `setErrors` are dropped at the path and below, and the
	 * ones on the paths around it, the form included, as the value they described changed. The state of rows
	 * and objects the branch no longer holds is dropped with them.
	 */
	setValue(path: string, value: unknown): void;
	/** Marks `path` touched, and validates it when the mode says so. */
	blur(path: string): void;
	/**
	 * Replaces the defaults with `values` when given, then restores the values to the defaults and clears
	 * every error, touched and dirty mark and the failed-check state.
	 *
	 * @remarks Validation still running when this is called is dropped and not run again; every row gets a new id.
	 */
	reset(values?: Record<string, unknown>): void;
	/**
	 * Validates `paths` (the whole form when omitted, nothing when empty), records the errors and resolves whether it passed.
	 *
	 * @remarks
	 * It resolves `false` while any error, from any source, remains at the validated paths after the run,
	 * so a server or native error blocks it. A failure of its own validation starts the failed-check state
	 * for those paths, so they re-validate by `reValidateMode` from then on. It does not mark anything
	 * submitted or touched.
	 */
	validate(paths?: readonly string[]): Promise<boolean>;
	/**
	 * Whether `paths` (the whole form when omitted) is valid, by the same count as `validate`, without its writes.
	 *
	 * @remarks Writes no error and changes no state. Errors a host set count; errors recorded earlier do not, as the check validates afresh.
	 */
	checkValidity(paths?: readonly string[]): Promise<boolean>;
	/**
	 * Replaces the errors one source reports, by dotted path (`FORM_ROOT` for the form); an empty map clears the source.
	 *
	 * @remarks
	 * Throws for a source a host cannot set, for a path with a reserved `__` segment other than `FORM_ROOT`,
	 * and for a path that names a row an array does not have; a path below an object that is merely absent is
	 * allowed. Writing identical errors changes nothing and notifies nobody.
	 */
	setErrors(source: FormErrorSource, errors: Readonly<Record<string, FormStateErrorInput>>): void;
	/**
	 * Replaces what the platform's controls report, by dotted path of the control.
	 *
	 * @remarks
	 * The facts are an input to validation, not errors: when a validation runs for a path, by mode, by a
	 * failed check or explicitly, its result is the failed rules followed by the control's fact, so native
	 * validity has exactly the timing of the engine's. `validate` and `checkValidity` count the facts in
	 * scope. The call only stores them and notifies nobody, because it is always followed by the host's
	 * `setValue`, `blur` or `validate`, which does. A host sends the whole map each time, and again after rows
	 * move, since the facts are keyed by the path a control has; `reset` clears them.
	 */
	setNativeValidity(validity: Readonly<Record<string, NativeValidity>>): void;
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
