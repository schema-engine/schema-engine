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
 * (`contacts.1.email`) wherever the API takes one, and {@link FORM_PATH} names the form itself. It holds
 * no submission state (`isSubmitting`, `submitCount`, a submit guard): the runtime owns those. Focus,
 * native controls and native submit belong to the host, and there is no control registration: a host
 * bridges a control into the container with {@link FormStateContainer.setValue},
 * {@link FormStateContainer.blur} and {@link FormStateContainer.setErrors}.
 *
 * The container is named for what it holds, not `FormStore`, which is a class of Radiant UI. Internal
 * until both renderer bindings run on it. Nothing here is exported from a package entry point.
 */

/** The path of the form itself: where an error about the form, rather than a field, is kept. */
export const FORM_PATH = '';

/** When a field validates: on `change`, on `blur`, on both (`all`) or only on an explicit {@link FormStateContainer.validate}. */
export type FormValidationMode = 'onSubmit' | 'onChange' | 'onBlur' | 'all';

/** When a field validates once a {@link FormStateContainer.validate} over it has failed. */
export type FormReValidateMode = 'onSubmit' | 'onChange' | 'onBlur';

/** The error shown for one field. */
export interface FormStateError {
	readonly type: string;
	readonly message: string;
}

/**
 * An error as a caller of {@link FormStateContainer.setErrors} may give it.
 *
 * @remarks
 * Both parts are optional, as a native control's validity or a server response may carry only one. The
 * container keeps a missing `type` as the name of the source and a missing `message` as an empty string,
 * so an error is always a whole {@link FormStateError} and `undefined` never reaches a field. An error with
 * an empty message still counts as an error: it blocks {@link FormStateContainer.validate}.
 */
export interface FormStateErrorInput {
	readonly type?: string;
	readonly message?: string;
}

/**
 * Who reports an error a host sets.
 *
 * @remarks
 * Three sources report errors, with a fixed precedence where they disagree about a path: `native`, the
 * validity of the platform's own controls, is lowest; the container's own `validation` is above it; and
 * `server`, which knows what the client cannot, is highest. `validation` is written only by the container,
 * so a host sets the other two.
 */
export type FormErrorSource = 'native' | 'server';

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
	 * The error shown for each path, from the highest source that reports one for exactly that path.
	 *
	 * @remarks
	 * Never inherited: an error on `contacts` is not an error on `contacts.0.email`, and both can be present.
	 * An error about the form itself is at {@link FORM_PATH}.
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
	 * Replaces the errors one source reports, by dotted path; an empty map clears the source.
	 *
	 * @remarks Where sources disagree about a path, the highest wins: `server`, then the container's own validation, then `native`.
	 */
	setErrors(source: FormErrorSource, errors: Readonly<Record<string, FormStateErrorInput>>): void;
	/**
	 * The commands of the array at `path`, the same object each time.
	 *
	 * @remarks Rows are read from `snapshot.rowIds[path]`; `toFieldArrayValue` combines the two for a widget.
	 */
	fieldArray(path: string): FieldArrayCommands;
}

/** What {@link FormStateContainerFactory} builds a container from. */
export interface FormStateContainerOptions {
	readonly elements: ValidationElementTree;
	readonly registry: ValidationRegistry;
	readonly defaults?: Record<string, unknown>;
	/**
	 * The `rowIds` of a snapshot rendered elsewhere, such as the server's, to adopt for the arrays it names.
	 *
	 * @remarks An array whose row count differs keeps the ids the container minted.
	 */
	readonly rowIds?: Readonly<Record<string, readonly string[]>>;
	/** @defaultValue `'onSubmit'` */
	readonly validationMode?: FormValidationMode;
	/** @defaultValue `'onChange'` */
	readonly reValidateMode?: FormReValidateMode;
}

/** What `formStateContainerConformance` builds the container under test with. */
export type FormStateContainerFactory = (options: FormStateContainerOptions) => FormStateContainer;
