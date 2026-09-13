import type { FormEngine } from '@schema-engine/forms/engine/form-engine';

let activeEngine: FormEngine | null = null;
const activeEngineListeners = new Set<(engine: FormEngine) => void>();

/**
 * Subscribes to changes to the active form engine.
 *
 * @remarks
 * If an active engine is already registered, the listener is called immediately.
 */
export function onActiveEngineChange(listener: (engine: FormEngine) => void): () => void {
	activeEngineListeners.add(listener);
	if (activeEngine) {
		listener(activeEngine);
	}
	return () => activeEngineListeners.delete(listener);
}

/**
 * Records the engine a host should fall back to when no context is resolvable.
 *
 * @remarks
 * SSR consumers construct before any provider frame is pushed, so field hosts
 * cannot resolve `formEngineContext` during serialization. `createRadiantFormEngine`
 * records its engine here; hosts use it only when the context is unresolved, and
 * the live context wins after hydration.
 */
export function setActiveFormEngine(engine: FormEngine | null): void {
	activeEngine = engine;
	if (engine) {
		for (const listener of activeEngineListeners) {
			listener(engine);
		}
	}
}

/** Last engine created via `createRadiantFormEngine`, if any. */
export function getActiveFormEngine(): FormEngine | undefined {
	return activeEngine ?? undefined;
}
