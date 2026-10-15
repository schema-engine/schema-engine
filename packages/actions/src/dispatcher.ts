import type { ActionConfigBase, ActionDispatchInput, ActionExecutionResult } from './types';
import type { ActionRegistryProvider } from './registry';
import { Logger } from '@ecopages/logger';

const logger = new Logger('[@schema-engine/actions]');

type MetadataContext = {
	metadata?: Record<string, unknown>;
};

function isMetadataContext(value: unknown): value is MetadataContext {
	return typeof value === 'object' && value !== null;
}

/**
 * Runs matching actions sequentially and merges caller metadata into their context.
 */
export class ActionDispatcher<TBaseContext = unknown, TTrigger = string> {
	constructor(private readonly registry: ActionRegistryProvider<TBaseContext, TTrigger>) {}

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

		const results: ActionExecutionResult[] = [];
		for (const action of actions) {
			if (action.enabled === false || !this.shouldExecute(action, trigger)) continue;
			const registration = this.registry.getAction(action.$type);
			if (!registration) {
				const error = `No handler registered for action type: ${action.$type}`;
				logger.error(error, { actionId: action.id, availableActions: this.registry.getActionTypes() });
				results.push({ success: false, error, shouldContinue: true });
				continue;
			}
			if (action.triggers === undefined && !(registration.metadata.defaultTriggers ?? []).includes(trigger))
				continue;
			logger.debug(`Executing action: ${action.id} (${action.$type})`);
			let result: ActionExecutionResult;
			try {
				result = await registration.execute({
					...enhancedContext,
					config: action,
					trigger,
					...(triggeredBy ? { triggeredBy } : {}),
				});
			} catch (error) {
				result = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
					shouldContinue: true,
				};
			}
			results.push(result);
			if (!result.success) logger.warn(`Action ${action.id} failed`, result);
			if (!result.success && result.shouldContinue === false) break;
		}
		return results;
	}

	/** @remarks Explicit triggers can exclude an action before its registration is needed. */
	private shouldExecute(action: ActionConfigBase, trigger: TTrigger): boolean {
		return action.triggers === undefined || action.triggers.some((candidate) => candidate === trigger);
	}

	/**
	 * Dispatch actions without waiting for results (fire-and-forget).
	 *
	 * **Contract:** Best-effort execution. Never throws to the caller. Handler failures
	 * are returned as failed `ActionExecutionResult` entries (dispatch does not reject).
	 * If `dispatch()` itself rejects unexpectedly, the error is logged and swallowed.
	 *
	 * @param input - Actions, trigger, context, and optional metadata / triggeredBy
	 */
	dispatchSync<TConfig extends ActionConfigBase>(input: ActionDispatchInput<TConfig, TBaseContext, TTrigger>): void {
		void this.dispatch(input).catch((error) => {
			logger.error('dispatchSync failed:', error);
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
