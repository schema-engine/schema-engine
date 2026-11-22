import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { fromExternalStore, type Signal } from '@ecopages/signals';
import {
	selectError,
	toFieldArrayValue,
	type FormStateContainer,
	type FormStateSnapshot,
} from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { describeIssue } from '@/lib/describe-issue';
import type { FieldArrayValue, FormFieldValue } from '../../types';

/**
 * Form operations scoped to the `se-form-instance` that contains the host.
 *
 * @remarks
 * The instance owns one {@link FormStateContainer} and provides it on its own context, so a host reads
 * the form it belongs to and there is no global active form. Place the host inside the instance (or in
 * the form a `FormRenderer` renders). The container is the engine's own, with nested values, so a
 * dotted path (`contacts.0.email`) names a value in every read and write and nothing is translated.
 *
 * Reads are snapshots; follow changes with {@link FormController.select}, which returns a signal
 * over a selector of the snapshot, or with `connect`. A new container replaces the old one when the
 * instance's config or engine changes, so the controller resolves it from the context on each use
 * and keeps no copy. `connect` waits for the container and requests an update on each change; call
 * `disconnect` when a manually managed host disconnects or moves to another form.
 */
export class FormController {
	private unsubscribeContext?: () => void;
	private unsubscribeContainer?: () => void;
	private subscribed?: FormInstanceContextValue;

	constructor(readonly host: HTMLElement) {}

	get ready(): boolean {
		return this.container !== undefined;
	}

	/** The form's state container, once the instance has one. */
	get container(): FormStateContainer | undefined {
		return this.context()?.container;
	}

	private context(): FormInstanceContextValue | undefined {
		if (this.unsubscribeContext) return this.subscribed;
		return this.resolve()?.context;
	}

	/** The nearest provider of the instance context at or above the host, and what it holds. */
	private resolve(): { target: HTMLElement; context: FormInstanceContextValue } | undefined {
		let current: Node | null = this.host;
		while (current) {
			if (current instanceof HTMLElement) {
				const context = this.read(current);
				if (context) return { target: current, context };
			}
			current = current.parentNode;
		}
		return undefined;
	}

	private read(target: HTMLElement): FormInstanceContextValue | undefined {
		let value: FormInstanceContextValue | undefined;
		target.dispatchEvent(
			new ContextSubscriptionRequestEvent(formInstanceContext, (context) => {
				value = context;
			}),
		);
		return value;
	}

	private requireContainer(): FormStateContainer {
		const container = this.container;
		if (!container) throw new Error('FormController requires a connected se-form-instance.');
		return container;
	}

	/**
	 * Calls `onChange` when the form's container becomes available or is replaced, and after each change of
	 * the container's state.
	 */
	connect(onChange: () => void = () => {}): void {
		this.disconnect();
		(this.resolve()?.target ?? this.host).dispatchEvent(
			new ContextSubscriptionRequestEvent(
				formInstanceContext,
				(context, unsubscribe) => {
					if (unsubscribe) this.unsubscribeContext = unsubscribe;
					const previous = this.subscribed?.container;
					this.subscribed = context;
					if (context?.container === previous) return;
					this.unsubscribeContainer?.();
					this.unsubscribeContainer = context?.container?.subscribe(onChange);
					if (context?.container) onChange();
				},
				undefined,
				true,
				(unsubscribe) => {
					this.unsubscribeContext = unsubscribe;
				},
			),
		);
	}

	disconnect(): void {
		this.unsubscribeContext?.();
		this.unsubscribeContext = undefined;
		this.unsubscribeContainer?.();
		this.unsubscribeContainer = undefined;
		this.subscribed = undefined;
	}

	/** The nested values now; the same object until a value changes. */
	getValues(): Readonly<Record<string, unknown>> {
		return this.requireContainer().getSnapshot().values;
	}

	getValue(path: string): unknown {
		return this.requireContainer().getValue(path);
	}

	setValue(path: string, value: unknown): void {
		this.requireContainer().setValue(path, value);
	}

	/** Restores the defaults, or replaces them with `values` first, and clears the form's field state. */
	reset(values?: Record<string, unknown>): void {
		this.requireContainer().reset(values);
	}

	/** The container's snapshot now. */
	get formState(): FormStateSnapshot {
		return this.requireContainer().getSnapshot();
	}

	/** Validates `names` (the whole form when omitted) and resolves whether they are valid. */
	async trigger(names?: string | string[]): Promise<boolean> {
		const paths = names === undefined ? undefined : Array.isArray(names) ? names : [names];
		return this.requireContainer().validate(paths);
	}

	/**
	 * A signal over a selector of the container's snapshot.
	 *
	 * @remarks
	 * Selectors are pure functions of the snapshot, such as `selectFieldState` or
	 * `(snapshot) => snapshot.rowIds['contacts']?.length ?? 0`. The signal notifies only when the
	 * selected value changes. Read it once subscribed, in a computed or an effect, because an
	 * unsubscribed read answers with the container's server snapshot. A new container, after a config change,
	 * is a new form: select again from `connect`'s callback.
	 */
	select<Selected>(selector: (snapshot: FormStateSnapshot) => Selected): Signal<Selected> {
		return fromExternalStore(this.requireContainer(), selector);
	}

	field(path: string): FormFieldValue {
		const context = this.context();
		const container = this.requireContainer();
		return {
			name: path,
			get value() {
				return container.getValue(path);
			},
			get error() {
				const issue = selectError(container.getSnapshot(), path);
				return issue && describeIssue(issue, path, context?.formatIssue);
			},
			onChange: (value) => container.setValue(path, value),
			onBlur: () => container.blur(path),
		};
	}

	/** The row commands of the array at `path`, with its current rows. */
	fieldArray(path: string): FieldArrayValue {
		const container = this.requireContainer();
		return toFieldArrayValue(container.getSnapshot().rowIds[path], container.fieldArray(path));
	}
}
