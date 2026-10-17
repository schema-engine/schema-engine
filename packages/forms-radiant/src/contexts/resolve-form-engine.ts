import { logger } from '@/lib/logger';
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

const reportedHosts = new WeakSet<HTMLElement>();

/**
 * Reports a host that no engine can reach, once per host.
 *
 * @remarks
 * A host under `se-form-renderer` stays quiet because the renderer's engine can
 * still arrive after the host connects, and a detached host (server rendering)
 * stays quiet because its engine is supplied by the render in progress.
 */
function reportMissingEngine(host: HTMLElement): void {
	if (!host.isConnected || host.closest('se-form-renderer') || reportedHosts.has(host)) {
		return;
	}
	reportedHosts.add(host);
	logger.warn(
		`Could not resolve FormEngine for <${host.tagName.toLowerCase()}>: no engine reaches it. Pass an explicit \`engine\` prop or render the host inside \`se-form-renderer\`.`,
	);
}

/**
 * Resolves the engine for a host: explicit prop, context, then owning render.
 *
 * @remarks
 * There is no module-level engine registry: an engine reaches a host only
 * through one of those three paths, however many engines the page has created.
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

	const owning = peekOwningFormEngine();
	if (!owning && host) {
		reportMissingEngine(host);
	}
	return owning;
}
