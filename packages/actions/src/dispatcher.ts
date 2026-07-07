import type { ActionConfigBase, ActionDispatchInput, ActionExecutionResult } from './types';
import type { ActionRegistryProvider } from './registry';
import { ActionExecutor } from './executor';

type MetadataContext = {
	metadata?: Record<string, unknown>;
};

function isMetadataContext(value: unknown): value is MetadataContext {
	return typeof value === 'object' && value !== null;
}

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
 * const results = await dispatcher.dispatch({
 *   actions,
 *   trigger: 'submit',
 *   context,
 *   metadata: { userId: '123' },
 * });
 *
 * // Fire-and-forget
 * dispatcher.dispatchSync({ actions, trigger: 'change', context });
 * ```
 */
export class ActionDispatcher<TBaseContext = unknown, TTrigger = string> {
	private executor: ActionExecutor<TBaseContext, TTrigger>;

	constructor(registry: ActionRegistryProvider<TBaseContext, TTrigger>, options: ActionDispatcherOptions = {}) {
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
	async dispatch<TConfig extends ActionConfigBase>({
		actions,
		trigger,
		context,
		metadata,
		triggeredBy,
	}: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): Promise<ActionExecutionResult[]> {
		if (!actions || actions.length === 0) {
			return [];
		}

		const enhancedContext = metadata ? this.mergeMetadata(context, metadata) : context;

		return this.executor.execute({
			actions,
			trigger,
			context: enhancedContext,
			triggeredBy,
		});
	}

	/**
	 * Dispatch actions without waiting for results (fire-and-forget).
	 *
	 * **Contract:** Best-effort execution. Never throws to the caller. Handler failures
	 * are returned as failed `ActionExecutionResult` entries (the executor does not reject).
	 * If `dispatch()` itself rejects unexpectedly, the error is logged and swallowed.
	 *
	 * @param input - Actions, trigger, context, and optional metadata / triggeredBy
	 */
	dispatchSync<TConfig extends ActionConfigBase>(input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): void {
		void this.dispatch(input).catch((error) => {
			console.error('[ActionDispatcher] dispatchSync failed:', error);
		});
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
	private mergeMetadata(context: TBaseContext, metadata: Record<string, unknown>): TBaseContext {
		if (!isMetadataContext(context)) {
			return context;
		}

		const existingMetadata = context.metadata;

		return {
			...context,
			metadata: {
				...(typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {}),
				...metadata,
			},
		};
	}
}
