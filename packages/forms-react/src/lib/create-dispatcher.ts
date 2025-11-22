import type { ActionExecutor } from '@schema-engine/forms';
import type {
	ActionExecutionContext,
	ActionExecutionResult,
	FormActionConfig,
	FormActionTrigger,
} from '@schema-engine/forms';

/**
 * Enhanced ActionExecutor with dispatcher methods
 */
export interface ActionExecutorWithDispatcher extends ActionExecutor {
	/**
	 * Dispatch a trigger with optional extra metadata
	 * Returns action execution results
	 */
	dispatchTrigger: (
		actions: FormActionConfig[],
		trigger: FormActionTrigger,
		baseContext: ActionExecutionContext,
		extraMetadata?: Record<string, unknown>,
	) => Promise<ActionExecutionResult[]>;

	/**
	 * Dispatch a trigger without waiting for results (fire and forget)
	 */
	dispatchTriggerSync: (
		actions: FormActionConfig[],
		trigger: FormActionTrigger,
		baseContext: ActionExecutionContext,
		extraMetadata?: Record<string, unknown>,
	) => void;
}

/**
 * Enhance an ActionExecutor with dispatcher convenience methods
 *
 * This creates a wrapper around the executor that adds:
 * - dispatchTrigger: async method with metadata merging and empty-check
 * - dispatchTriggerSync: fire-and-forget version
 *
 * @param executor - The base ActionExecutor instance
 * @returns Enhanced executor with dispatcher methods
 */
export function createDispatcher(executor: ActionExecutor): ActionExecutorWithDispatcher {
	const dispatchTrigger = async (
		actions: FormActionConfig[],
		trigger: FormActionTrigger,
		baseContext: ActionExecutionContext,
		extraMetadata?: Record<string, unknown>,
	): Promise<ActionExecutionResult[]> => {
		if (!actions || actions.length === 0) {
			return [];
		}

		const context: ActionExecutionContext = {
			...baseContext,
			metadata: {
				...baseContext.metadata,
				...(extraMetadata || {}),
			},
		};

		return executor.executeTrigger(actions, trigger, context);
	};

	const dispatchTriggerSync = (
		actions: FormActionConfig[],
		trigger: FormActionTrigger,
		baseContext: ActionExecutionContext,
		extraMetadata?: Record<string, unknown>,
	): void => {
		void dispatchTrigger(actions, trigger, baseContext, extraMetadata);
	};

	return Object.assign(executor, {
		dispatchTrigger,
		dispatchTriggerSync,
	});
}
