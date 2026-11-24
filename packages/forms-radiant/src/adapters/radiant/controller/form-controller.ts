import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { fromExternalStore, type Signal } from '@ecopages/signals';
import type { FormRuntime } from '@schema-engine/forms';
import {
	issueText,
	type FormStateContainer,
	type FormStateIssue,
	type FormStateSnapshot,
	type FormSubmissionIssue,
} from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';

/**
 * The form of the `se-form-instance` that contains a host: its container, a signal over its state, and its issue text.
 *
 * @remarks
 * The instance owns one {@link FormStateContainer} and provides it on its own context, so a host reads
 * the form it belongs to and there is no global active form. Place the host inside the instance (or in
 * the form a `FormRenderer` renders). Commands go through {@link FormController.container}, whose paths
 * are dotted (`contacts.0.email`); state is followed with {@link FormController.select}. A new
 * container replaces the old one when the instance's config or engine changes, so the controller
 * resolves it from the context on each use and keeps no copy.
 */
export class FormController {
	constructor(readonly host: HTMLElement) {}

	/** The form's state container, once the instance has one. */
	get container(): FormStateContainer | undefined {
		return this.context()?.runtime?.container;
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

	/** Calls `listener` when the form's container is replaced, and after each change of its state; returns the function that stops. */
	private watchContainer(listener: () => void): () => void {
		let current: FormStateContainer | undefined;
		let unsubscribeContainer: (() => void) | undefined;
		let first = true;
		const stop = this.follow((context) => {
			const next = context?.runtime?.container;
			const initial = first;
			first = false;
			if (next === current && !initial) return;
			unsubscribeContainer?.();
			current = next;
			unsubscribeContainer = next?.subscribe(listener);
			if (next && !initial) listener();
		});
		return () => {
			stop();
			unsubscribeContainer?.();
		};
	}

	/**
	 * Calls `onRuntime` with the form's runtime now and each time the instance replaces it, `undefined` while it has none.
	 *
	 * @returns Stops following.
	 *
	 * @remarks
	 * The runtime belongs to one config and one engine, so a new one replaces it when either changes: hand it to something
	 * that follows the form (such as `registerFormAgentTool`) from here, and release what the previous call made first.
	 */
	watchRuntime(onRuntime: (runtime: FormRuntime | undefined) => void): () => void {
		let current: FormRuntime | undefined;
		let first = true;
		return this.follow((context) => {
			const next = context?.runtime;
			if (next === current && !first) return;
			first = false;
			current = next;
			onRuntime(next);
		});
	}

	/**
	 * A signal over a selector of the container's snapshot, `undefined` while the form has no container.
	 *
	 * @remarks
	 * Selectors are pure functions of the snapshot, such as `selectFieldState` or
	 * `(snapshot) => snapshot.rowIds['contacts']?.length ?? 0`. The signal notifies only when the
	 * selected value changes. Create it once, as a field, and read it in an effect or a computed, which subscribe
	 * it: an unsubscribed read answers with the container's server snapshot. It is total: before the container
	 * exists (a `rui-form` or an engine that arrives late) and on the server it reads `undefined`, and it follows
	 * the instance's container, so one that arrives or replaces the old reads and notifies from it.
	 */
	select<Selected>(selector: (snapshot: FormStateSnapshot) => Selected): Signal<Selected | undefined> {
		return fromExternalStore<FormStateSnapshot | undefined, Selected | undefined>(
			{
				subscribe: (listener) => this.watchContainer(listener),
				getSnapshot: () => this.container?.getSnapshot(),
				getServerSnapshot: () => this.container?.getServerSnapshot(),
			},
			(snapshot) => (snapshot === undefined ? undefined : selector(snapshot)),
		);
	}

	/**
	 * The text of an issue at `path` as the form shows it: the form's formatter, else the issue's own `message`.
	 *
	 * @remarks `undefined` when neither gives text, never the issue's `type`.
	 */
	formatIssue(issue: FormStateIssue | FormSubmissionIssue, { path }: { readonly path: string }): string | undefined {
		return issueText(issue, path, this.context()?.formatIssue);
	}
}
