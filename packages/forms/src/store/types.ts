import type { FieldArrayValue } from '@/adapters/types';
import type { ValidationElementTree } from '@/engine/value-validation';
import type { ValidationRegistry } from '@/schemas/validation/validation-registry';

/**
 * The internal form store contract: what a form's state container owns, and what it leaves to others.
 *
 * @remarks
 * The store owns the nested value tree, field state (errors, touched, dirty), field-array row ids and
 * the atomic updates that keep them consistent. Field state has the shape of the values: an object where
 * the value is an object, an array with one element per row where the value is an array. A path is a
 * plain dotted path with the row index in it (`contacts.1.email`) wherever the API takes one. It holds no submission state
 * (`isSubmitting`, `submitCount`, a submit guard): the runtime owns those. Focus, native controls and
 * native submit belong to the host, and there is no control registration: a host bridges a control
 * into the store with {@link FormStore.setValue}, {@link FormStore.blur} and {@link FormStore.setErrors}.
 *
 * Internal until both renderer bindings run on it. Nothing here is exported from a package entry point.
 */

/** When a field validates: on `change`, on `blur`, on both (`all`) or only on an explicit {@link FormStore.validate}. */
export type FormValidationMode = 'onSubmit' | 'onChange' | 'onBlur' | 'all';

/** When a field validates once a {@link FormStore.validate} over it has failed. */
export type FormReValidateMode = 'onSubmit' | 'onChange' | 'onBlur';

/** The error shown for one field. */
export interface FormStoreError {
	readonly type: string;
	readonly message: string;
}

/**
 * An error as a caller of {@link FormStore.setErrors} may give it.
 *
 * @remarks
 * Both parts are optional, as a native control's validity or a server response may carry only one. The
 * store keeps a missing `type` as the name of the source and a missing `message` as an empty string, so
 * an error is always a whole {@link FormStoreError} and `undefined` never reaches a field. An error
 * with an empty message still blocks {@link FormStore.validate}; showing it is the host's choice.
 */
export interface FormStoreErrorInput {
	readonly type?: string;
	readonly message?: string;
}

/**
 * Who wrote an error.
 *
 * @remarks
 * `validation` is the store's own, written by {@link FormStore.validate} and by validation on change
 * or blur. Every other source is named by its caller through {@link FormStore.setErrors}.
 */
export type FormErrorSource = string;

/** The reserved name of the store's own error source. */
export const VALIDATION_ERROR_SOURCE: FormErrorSource = 'validation';

/**
 * State in the shape of the values: a leaf where something is marked, nested objects and arrays around it.
 *
 * @remarks
 * An array has one element per row, `undefined` for a row with nothing marked. A leaf on a container
 * covers everything below it: an error on `tags` is the array's own, and a touched mark on `address`
 * covers its fields.
 */
export type FormStateTree<T> =
	T | readonly (FormStateTree<T> | undefined)[] | { readonly [key: string]: FormStateTree<T> };

/** The root of a {@link FormStateTree}, an object like the values. */
export type FormStateRoot<T> = { readonly [key: string]: FormStateTree<T> };

/**
 * The immutable state a subscriber reads.
 *
 * @remarks
 * Stable: {@link FormStore.getSnapshot} returns the same object until something changes, and a
 * branch that did not change keeps its reference, in `values`, in every tree and in every view. Plain
 * records and arrays, frozen. An opaque value, such as an array holding `File` objects, is kept and
 * compared by reference: it is never copied, frozen or diffed.
 */
export interface FormStoreSnapshot {
	/** The nested value tree. */
	readonly values: Readonly<Record<string, unknown>>;
	/**
	 * The error to show per dotted path, from every source; see {@link FormStore.setErrors} for which wins.
	 *
	 * @remarks The flat view of {@link FormStoreSnapshot.errorTree}, for hosts that look errors up by name.
	 */
	readonly errors: Readonly<Record<string, FormStoreError>>;
	/** The same errors in the shape of the values, for the engine's action context. */
	readonly errorTree: FormStateRoot<FormStoreError>;
	/** Where the user has blurred. Moves with its row; cleared by `reset`. */
	readonly touched: FormStateRoot<true>;
	/** Where a value differs from the defaults. */
	readonly dirty: FormStateRoot<true>;
	/** The ids of an array's rows, by array path, in row order; derived from the store's row identity. */
	readonly rowIds: Readonly<Record<string, readonly string[]>>;
	/** Whether a validation the store started, other than `checkValidity`, is still running. */
	readonly isValidating: boolean;
	/** Whether a {@link FormStore.validate} has failed since the last `reset`; see `reValidateMode`. */
	readonly checkFailed: boolean;
}

/** What is known about one field, after `getFieldState` of React Hook Form. */
export interface FormFieldState {
	/** The error shown for the path itself, or for a container around it. */
	readonly error: FormStoreError | undefined;
	readonly invalid: boolean;
	/** Whether the path, a path around it or a path below it has been blurred. */
	readonly isTouched: boolean;
	/** Whether the path, a path around it or a path below it differs from the defaults. */
	readonly isDirty: boolean;
}

/**
 * The commands over a form's state.
 *
 * @remarks
 * Every command is one atomic update: subscribers are notified once, and never see an array's values
 * and its row state out of step.
 */
export interface FormStore {
	/** Registers a listener for every snapshot change; returns the function that removes it. */
	subscribe(listener: () => void): () => void;
	/**
	 * Calls `listener` with the selected value when it changes, compared with `isEqual`.
	 *
	 * @remarks The explicit alternative to reading state through a proxy: a host names what it reads.
	 */
	subscribeTo<T>(
		selector: (snapshot: FormStoreSnapshot) => T,
		listener: (value: T) => void,
		isEqual?: (previous: T, next: T) => boolean,
	): () => void;
	getSnapshot(): FormStoreSnapshot;
	/** The snapshot to render on the server and during hydration: the initial state, never replaced. */
	getServerSnapshot(): FormStoreSnapshot;

	/** The value at a dotted path, from the current state. */
	getValue(path: string): unknown;
	getFieldState(path: string): FormFieldState;
	/**
	 * Replaces the whole branch at `path`.
	 *
	 * @remarks
	 * It is a change: it validates when the mode says so, re-validates dependents, and drops errors
	 * from {@link FormStore.setErrors} sources at the path and below, which describe a value that is gone.
	 * The state of rows and objects the branch no longer holds is dropped with them.
	 */
	setValue(path: string, value: unknown): void;
	/** Marks `path` touched, and validates it when the mode says so. */
	blur(path: string): void;
	/**
	 * Replaces the defaults with `values` when given, then restores the values to the defaults and clears
	 * every error, touched and dirty mark and the failed-check state.
	 *
	 * @remarks Validation still running when this is called is dropped; every row gets a new id.
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
	/** Whether `paths` (the whole form when omitted) is valid. Writes no error and changes no state. */
	checkValidity(paths?: readonly string[]): Promise<boolean>;
	/**
	 * Replaces the errors one source contributes; an empty map removes the source.
	 *
	 * @remarks
	 * Where several sources report an error for one path, the source set most recently wins, and the
	 * store's own `validation` source loses to every other. `validation` cannot be written here.
	 */
	setErrors(source: FormErrorSource, errors: Readonly<Record<string, FormStoreErrorInput>>): void;
	/** The row operations of the array at `path`, with the semantics of {@link FieldArrayValue}. */
	fieldArray(path: string): FieldArrayValue;
	/**
	 * Gives the rows of the array at `path` the ids a server already rendered.
	 *
	 * @remarks Does nothing unless `ids` has one id per current row.
	 */
	adoptRowIds(path: string, ids: readonly string[]): void;
}

/** What {@link FormStoreFactory} builds a store from. */
export interface FormStoreOptions {
	readonly elements: ValidationElementTree;
	readonly registry: ValidationRegistry;
	readonly defaultValues?: Record<string, unknown>;
	/** @defaultValue `'onSubmit'` */
	readonly validationMode?: FormValidationMode;
	/** @defaultValue `'onChange'` */
	readonly reValidateMode?: FormReValidateMode;
}

/** What `formStoreConformance` builds the store under test with. */
export type FormStoreFactory = (options: FormStoreOptions) => FormStore;
