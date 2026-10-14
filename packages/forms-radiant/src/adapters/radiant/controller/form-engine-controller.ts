import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { formEngineContext } from '@/components/provider';

/** Reads the nearest Radiant form engine context from a host. */
export class FormEngineController {
	private unsubscribeContext?: () => void;
	private formEngine?: FormEngine;

	constructor(readonly host: HTMLElement) {}

	get ready(): boolean {
		return this.engine !== undefined;
	}

	get engine(): FormEngine | undefined {
		if (!this.formEngine) {
			this.formEngine = this.readEngine();
		}
		return this.formEngine;
	}

	private readEngine(): FormEngine | undefined {
		let engine: FormEngine | undefined;
		this.host.dispatchEvent(
			new ContextSubscriptionRequestEvent(formEngineContext, (context) => {
				engine = context.engine;
			}),
		);
		return engine;
	}

	connect(onChange: () => void = () => {}): void {
		this.disconnect();
		this.host.dispatchEvent(
			new ContextSubscriptionRequestEvent(
				formEngineContext,
				(context, unsubscribe) => {
					this.formEngine = context.engine;
					if (this.formEngine) onChange();
					if (unsubscribe) this.unsubscribeContext = unsubscribe;
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
		this.formEngine = undefined;
	}
}
