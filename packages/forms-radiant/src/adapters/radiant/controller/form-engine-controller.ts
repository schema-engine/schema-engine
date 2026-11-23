import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms';
import { formEngineContext } from '@/components/provider';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

/** Resolves the engine from the host's context or active render scope. */
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
		return resolveFormEngine(this.host);
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
