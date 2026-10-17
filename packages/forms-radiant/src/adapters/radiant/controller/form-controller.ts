import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { FormStore, formContext } from '@ecopages/radiant-ui/form';
import { getValueAtPath } from '@schema-engine/forms/lib/path-values';
import { expandValues, flattenValues, readValue } from './values';
import { writeValue, isWritingValue } from './write-value';
import { getFieldArray } from './field-array';
import type { FieldArrayValue, FormFieldValue } from '../../types';

/**
 * Form operations scoped to the host's Radiant UI `formContext`.
 *
 * @remarks
 * Place the host inside `rui-form` (or pass `rui-form` itself). The controller
 * asks `formContext` on the host, then on ancestors, until a store answers. It
 * does not search descendants or the document. Reads are snapshots. `watchField`
 * and `watchForm` subscribe and return cleanup functions. `connect` waits for
 * context readiness and presentation updates and keeps existing watch
 * subscriptions, each on the store it subscribed to; call `disconnect` when a
 * manually managed host disconnects or moves to another form, which also ends
 * every watch subscription.
 */
export class FormController {
	private unsubscribeContext?: () => void;
	private formStore?: FormStore;
	private readonly subscriptions = new Set<() => void>();

	constructor(readonly host: HTMLElement) {}

	get ready(): boolean {
		return this.store !== undefined;
	}

	/** Live Radiant UI store from `formContext`, once the form is ready. */
	get store(): FormStore | undefined {
		if (!this.formStore) {
			const resolved = this.resolveStore();
			if (resolved) this.formStore = resolved.store;
		}
		return this.formStore;
	}

	private requireStore(): FormStore {
		const store = this.store;
		if (!store) throw new Error('FormController requires a connected rui-form.');
		return store;
	}

	private resolveStore(): { target: HTMLElement; store: FormStore } | undefined {
		let current: Node | null = this.host;
		while (current) {
			if (current instanceof HTMLElement) {
				const store = this.readStore(current);
				if (store) return { target: current, store };
			}
			current = current.parentNode;
		}
		return undefined;
	}

	private providerHost(): HTMLElement {
		return this.resolveStore()?.target ?? this.host;
	}

	private readStore(target: HTMLElement): FormStore | undefined {
		let store: FormStore | undefined;
		target.dispatchEvent(
			new ContextSubscriptionRequestEvent(formContext, (context) => {
				store = context.store;
			}),
		);
		return store instanceof FormStore ? store : undefined;
	}

	connect(onChange: () => void = () => {}): void {
		this.releaseContext();
		const target = this.providerHost();
		target.dispatchEvent(
			new ContextSubscriptionRequestEvent(
				formContext,
				(context, unsubscribe) => {
					this.unsubscribeContext = unsubscribe;
					this.formStore = context.store instanceof FormStore ? context.store : undefined;
					if (context.ready && this.formStore && !isWritingValue(this.formStore)) onChange();
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
		this.releaseContext();
		for (const unsubscribe of this.subscriptions) unsubscribe();
		this.subscriptions.clear();
	}

	private releaseContext(): void {
		this.unsubscribeContext?.();
		this.unsubscribeContext = undefined;
		this.formStore = undefined;
	}

	getValues(): Record<string, unknown> {
		return expandValues(this.requireStore().getValues());
	}

	getValue(name: string): unknown {
		return readValue(this.requireStore().getValues(), name);
	}

	setValue(name: string, value: unknown): void {
		writeValue(this.requireStore(), name, value);
	}

	reset(values?: Record<string, unknown>): void {
		this.requireStore().reset(values === undefined ? undefined : flattenValues(values));
	}

	get formState() {
		return { ...this.requireStore().getState(), values: this.getValues() };
	}

	async trigger(names?: string | string[]): Promise<boolean> {
		const store = this.requireStore();
		if (names === undefined) return store.validateAll();
		const results = await Promise.all(
			(Array.isArray(names) ? names : [names]).map((name) => store.validateField(name)),
		);
		return results.every(Boolean);
	}

	field(name: string): FormFieldValue {
		const store = this.requireStore();
		return {
			name,
			get value() {
				return readValue(store.getValues(), name);
			},
			get error() {
				return store.getFieldError(name);
			},
			onChange: (value) => writeValue(store, name, value),
			onBlur: () => {
				void store.handleFieldBlur(name);
			},
		};
	}

	fieldArray(name: string): FieldArrayValue {
		return getFieldArray(this.requireStore(), name);
	}

	watchField(name: string, listener: (value: unknown) => void): () => void {
		return this.watchForm((values) => listener(getValueAtPath(values, name)));
	}

	/** The listener receives an initial snapshot and each subsequent store notification. */
	watchForm(listener: (values: Record<string, unknown>) => void): () => void {
		const store = this.requireStore();
		const notify = () => {
			if (!isWritingValue(store)) listener(expandValues(store.getValues()));
		};
		const unsubscribeStore = store.subscribe(notify);
		const unsubscribe = () => {
			unsubscribeStore();
			this.subscriptions.delete(unsubscribe);
		};
		this.subscriptions.add(unsubscribe);
		notify();
		return unsubscribe;
	}
}
