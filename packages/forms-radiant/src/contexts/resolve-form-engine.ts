import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms';
import { formEngineContext } from '@/components/provider.js';
import { peekOwningFormEngine } from '@/contexts/form-engine-owner.js';

/**
 * Reads `formEngineContext` from the nearest provider above the host.
 *
 * @remarks
 * The request starts at the parent, so `se-form-renderer` does not read the
 * context it provides itself and an app can provide the engine above a renderer.
 */
export function readFormEngineFromContext(host: HTMLElement): FormEngine | undefined {
	let engine: FormEngine | undefined;
	(host.parentElement ?? host).dispatchEvent(
		new ContextSubscriptionRequestEvent(formEngineContext, (context) => {
			engine = context.engine;
		}),
	);
	return engine;
}

/**
 * Resolves the engine for a host: explicit prop, context, then owning render.
 *
 * @remarks
 * There is no module-level engine registry: an engine reaches a host only
 * through one of those three paths, however many engines the page has created.
 * A host that finds none stays quiet: the app may bind the engine to the
 * renderer after the host connects, and hosts follow the renderer's context
 * when it arrives.
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
