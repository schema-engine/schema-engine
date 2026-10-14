import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { formEngineContext } from '@/components/provider';
import { peekOwningFormEngine } from '@/contexts/form-engine-owner';

/**
 * Reads `formEngineContext` from the host or an ancestor.
 */
export function readFormEngineFromContext(host: HTMLElement): FormEngine | undefined {
	let engine: FormEngine | undefined;
	host.dispatchEvent(
		new ContextSubscriptionRequestEvent(formEngineContext, (context) => {
			engine = context.engine;
		}),
	);
	return engine;
}

/**
 * Resolves the engine for a host: explicit prop, context, then owning render.
 */
export function resolveFormEngine(host?: HTMLElement, explicit?: FormEngine): FormEngine | undefined {
	if (explicit) {
		return explicit;
	}

	if (host) {
		const fromContext = readFormEngineFromContext(host);
		if (fromContext) {
			return fromContext;
		}
	}

	return peekOwningFormEngine();
}
