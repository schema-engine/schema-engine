import { logger } from '@/lib/logger';
import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { formEngineContext } from '@/components/provider';
import { peekOwningFormEngine } from '@/contexts/form-engine-owner';
import { getDefaultFormEngine, getRegisteredEngineCount, onRegisteredEngineChange } from '@/registries/active-engine';

/**
 * Reads `formEngineContext` from the host or an ancestor.
 */
export function readFormEngineFromContext(host: HTMLElement): FormEngine | undefined {
	let current: Node | null = host;
	while (current) {
		if (current instanceof HTMLElement) {
			let engine: FormEngine | undefined;
			current.dispatchEvent(
				new ContextSubscriptionRequestEvent(formEngineContext, (context) => {
					engine = context.engine;
				}),
			);
			if (engine) {
				return engine;
			}
		}
		current = current.parentNode;
	}
	return undefined;
}

let warnedMultiEngine = false;

function warnMultiEngineFallback(host: HTMLElement): void {
	if (warnedMultiEngine) {
		return;
	}
	warnedMultiEngine = true;
	logger.warn(
		`Could not resolve FormEngine for <${host.tagName.toLowerCase()}>: multiple engines are registered. Pass an explicit \`engine\` prop or render the host inside \`se-form-renderer\`.`,
	);
}

/**
 * Resolves the engine for a host: explicit prop, context, render scope, then registered default.
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
	if (owning) {
		return owning;
	}

	const fallback = getDefaultFormEngine();
	if (!fallback && host && getRegisteredEngineCount() > 1) {
		warnMultiEngineFallback(host);
	}
	return fallback;
}

/**
 * Invokes `apply` when an engine becomes available on `host`, then on later registry updates until `dispose`.
 */
export function whenEngineAvailable(
	host: HTMLElement,
	explicit: FormEngine | undefined,
	apply: (engine: FormEngine) => void,
): () => void {
	return onRegisteredEngineChange(() => {
		const engine = resolveFormEngine(host, explicit);
		if (engine) {
			apply(engine);
		}
	});
}
