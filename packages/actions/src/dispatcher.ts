import type { ActionConfigBase, ActionExecutionResult } from './types';
import type { ActionRegistryProvider } from './registry';
import { ActionExecutor } from './executor';

/**
 * Action Dispatcher Options
 */
export interface ActionDispatcherOptions {
	/** Enable debug logging to console */
	debug?: boolean;
}

/**
 * Action Dispatcher
 *
 * High-level orchestration layer for action execution with convenience methods.
 * Provides metadata merging, sync/async dispatch variants, and simplified API.
 *
 * This wraps ActionExecutor to provide domain-specific conveniences while
 * keeping the core executor clean and generic.
 *
 * @template TConfig - The action configuration type
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 *
 * @example
 * ```typescript
 * const dispatcher = new ActionDispatcher(registry, { debug: true });
 *
 * // Async dispatch with metadata
 * const results = await dispatcher.dispatch(
 *   actions,
 *   'submit',
 *   context,
 *   { userId: '123' }
 * );
 *
 * // Fire-and-forget
 * dispatcher.dispatchSync(actions, 'change', context);
 * ```
 */
export class ActionDispatcher<
	TConfig extends ActionConfigBase = ActionConfigBase,
	TContext = unknown,
	TTrigger = string,
> {
	private executor: ActionExecutor<TConfig, TContext, TTrigger>;

	constructor(registry: ActionRegistryProvider<TContext, TTrigger>, options: ActionDispatcherOptions = {}) {
		this.executor = new ActionExecutor(registry, options);
	}

	/**
	 * Dispatch actions for a specific trigger with metadata merging
	 *
	 * Merges additional metadata into the context and executes all matching actions.
	 * Returns empty array if no actions are provided.
	 *
	 * @param actions - Array of action configurations to potentially execute
	 * @param trigger - The trigger/event that is causing execution
	 * @param context - Domain-specific context data
	 * @param metadata - Additional metadata to merge into context
	 * @returns Array of execution results
	 */
	async dispatch(
		actions: TConfig[],
		trigger: TTrigger,
		context: TContext,
		metadata?: Record<string, unknown>,
	): Promise<ActionExecutionResult[]> {
		if (!actions || actions.length === 0) {
			return [];
		}

		const enhancedContext = metadata ? this.mergeMetadata(context, metadata) : context;

		return this.executor.execute(actions, trigger, enhancedContext);
	}

	/**
	 * Dispatch actions without waiting for results (fire and forget)
	 *
	 * Useful for side effects that don't need to block execution or return results.
	 *
	 * @param actions - Array of action configurations to potentially execute
	 * @param trigger - The trigger/event that is causing execution
	 * @param context - Domain-specific context data
	 * @param metadata - Additional metadata to merge into context
	 */
	dispatchSync(actions: TConfig[], trigger: TTrigger, context: TContext, metadata?: Record<string, unknown>): void {
		void this.dispatch(actions, trigger, context, metadata);
	}

	/**
	 * Merge additional metadata into context
	 *
	 * Handles contexts that may or may not have a metadata property.
	 *
	 * @param context - The original context
	 * @param metadata - Metadata to merge in
	 * @returns Enhanced context with merged metadata
	 */
	private mergeMetadata(context: TContext, metadata: Record<string, unknown>): TContext {
		if (typeof context !== 'object' || context === null) {
			return context;
		}

		const hasMetadata = 'metadata' in context;
		const existingMetadata = hasMetadata ? (context as Record<string, unknown>).metadata : {};

		return {
			...context,
			metadata: {
				...(typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {}),
				...metadata,
			},
		} as TContext;
	}
}
