import { ActionDispatcher, type ActionDispatcherOptions } from './dispatcher.js';
import { ActionRegistry } from './registry.js';

/**
 * Wired action system returned by {@link createActionSystem}.
 */
export interface ActionSystem<TBaseContext = unknown, TTrigger = string> {
	registry: ActionRegistry<TBaseContext, TTrigger>;
	/** Recommended public orchestrator — use this for dispatch in application code. */
	dispatcher: ActionDispatcher<TBaseContext, TTrigger>;
}

/**
 * Create a wired action system with registry + dispatcher.
 *
 * **Recommended entry point** for most consumers. `ActionDispatcher` is the
 * public orchestrator (metadata merge, empty-guard, sync/async dispatch).
 * `ActionExecutor` remains available for advanced/low-level use.
 *
 * @example
 * ```typescript
 * const { registry, dispatcher } = createActionSystem<MyContext, MyTrigger>();
 *
 * registry.register(logAction);
 *
 * await dispatcher.dispatch({
 *   actions,
 *   trigger: 'submit',
 *   context,
 * });
 * ```
 */
export function createActionSystem<TBaseContext = unknown, TTrigger = string>(
	options: ActionDispatcherOptions = {},
): ActionSystem<TBaseContext, TTrigger> {
	const registry = new ActionRegistry<TBaseContext, TTrigger>();
	const dispatcher = new ActionDispatcher(registry, options);
	return { registry, dispatcher };
}
