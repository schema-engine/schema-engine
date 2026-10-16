import type { FormEngine } from '@schema-engine/forms/engine/form-engine';

const registeredEngines = new Set<FormEngine>();
const registeredEngineListeners = new Set<(engine: FormEngine | undefined) => void>();

function notifyRegisteredEngineListeners(): void {
	const fallback = getDefaultFormEngine();
	for (const listener of registeredEngineListeners) {
		listener(fallback);
	}
}

/**
 * Subscribes to changes in the registered engine set (SSR bootstrap default).
 */
export function onRegisteredEngineChange(listener: (engine: FormEngine | undefined) => void): () => void {
	registeredEngineListeners.add(listener);
	listener(getDefaultFormEngine());
	return () => registeredEngineListeners.delete(listener);
}

/** Clears registered engines. For unit tests only. */
export function resetRegisteredFormEnginesForTests(): void {
	registeredEngines.clear();
	notifyRegisteredEngineListeners();
}

/**
 * Records an engine for SSR fallback when exactly one exists in the document.
 */
export function registerFormEngine(engine: FormEngine): void {
	registeredEngines.add(engine);
	notifyRegisteredEngineListeners();
}

export function getRegisteredEngineCount(): number {
	return registeredEngines.size;
}

/**
 * Default engine when exactly one has been registered; otherwise `undefined`.
 */
export function getDefaultFormEngine(): FormEngine | undefined {
	if (registeredEngines.size !== 1) {
		return undefined;
	}
	return registeredEngines.values().next().value;
}
