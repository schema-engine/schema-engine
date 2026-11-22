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
	private stopWatching?: () => void;

	constructor(readonly host: HTMLElement) {}

	get ready(): boolean {
		return this.container !== undefined;
	}

	/** The form's state container, once the instance has one. */
	get container(): FormStateContainer | undefined {
		return this.context()?.container;
	}

	private context(): FormInstanceContextValue | undefined {
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
	 * Follows the instance's context: `onContext` receives what the nearest provider holds now and each time it publishes again.
	 *
	 * @returns Stops following.
	 */
	private follow(onContext: (context: FormInstanceContextValue | undefined) => void): () => void {
		let stop: (() => void) | undefined;
		(this.resolve()?.target ?? this.host).dispatchEvent(
			new ContextSubscriptionRequestEvent(
				formInstanceContext,
				(context, unsubscribe) => {
					if (unsubscribe) stop = unsubscribe;
					onContext(context);
				},
				undefined,
				true,
				(unsubscribe) => {
					stop = unsubscribe;
				},
			),
		);
		return () => stop?.();
	}

	/**
	 * Calls `listener` when the form's container becomes available or is replaced, and after each change of
	 * the container's state; returns the function that stops.
	 */
	private watchContainer(listener: () => void, notifyInitial: boolean): () => void {
		let current: FormStateContainer | undefined;
		let unsubscribeContainer: (() => void) | undefined;
		let first = true;
		const stop = this.follow((context) => {
			const next = context?.container;
			const initial = first;
			first = false;
			if (next === current && !initial) return;
			unsubscribeContainer?.();
			current = next;
			unsubscribeContainer = next?.subscribe(listener);
			if (next && (notifyInitial || !initial)) listener();
		});
		return () => {
			stop();
			unsubscribeContainer?.();
		};
	}

	/**
	 * Calls `onChange` when the form's container becomes available or is replaced, and after each change of
	 * the container's state.
	 */
	connect(onChange: () => void = () => {}): void {
		this.disconnect();
		this.stopWatching = this.watchContainer(onChange, true);
	}

	disconnect(): void {
		this.stopWatching?.();
		this.stopWatching = undefined;
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
	 * unsubscribed read answers with the container's server snapshot. It follows the instance's
	 * container: a new one, after a config change, replaces the old and the signal reads and notifies from it.
	 */
	select<Selected>(selector: (snapshot: FormStateSnapshot) => Selected): Signal<Selected> {
		return fromExternalStore<FormStateSnapshot, Selected>(
			{
				subscribe: (listener) => this.watchContainer(listener, false),
				getSnapshot: () => this.requireContainer().getSnapshot(),
				getServerSnapshot: () => this.requireContainer().getServerSnapshot(),
			},
			selector,
		);
	}

	/** A binding of the field at `path`, which reads and writes the container the instance has at the time of each use. */
	field(path: string): FormFieldValue {
		const container = () => this.requireContainer();
		const formatIssue = () => this.context()?.formatIssue;
		return {
			name: path,
			get value() {
				return container().getValue(path);
			},
			get error() {
				const issue = selectError(container().getSnapshot(), path);
				return issue && describeIssue(issue, path, formatIssue());
			},
			onChange: (value) => container().setValue(path, value),
			onBlur: () => container().blur(path),
		};
	}

	/** The row commands of the array at `path`, with its current rows. */
	fieldArray(path: string): FieldArrayValue {
		const container = this.requireContainer();
		return toFieldArrayValue(container.getSnapshot().rowIds[path], container.fieldArray(path));
	}
}
