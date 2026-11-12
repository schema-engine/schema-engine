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
 * A detached host (server rendering, or before the host is attached) stays
 * quiet because it cannot reach an ancestor context yet. A connected host under
 * `se-form-renderer` reports too: the renderer must have its engine before its
 * children connect, so a missing one is a configuration error.
 */
function reportMissingEngine(host: HTMLElement): void {
	if (!host.isConnected || reportedHosts.has(host)) {
		return;
	}
	reportedHosts.add(host);
	logger.warn(
		`Could not resolve FormEngine for <${host.tagName.toLowerCase()}>: no engine reaches it. Pass an explicit \`engine\` prop, or give the enclosing \`se-form-renderer\` its engine before the host connects.`,
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
