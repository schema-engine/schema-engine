import type { ActionConfigBase, ActionExecuteInput, ActionExecutionResult, ActionRegistration } from './types';
import type { ActionRegistryProvider } from './registry';

/**
 * Action Executor Options
 */
export interface ActionExecutorOptions {
	/** Enable debug logging to console */
	debug?: boolean;
}

/**
 * Action Executor
 *
 * Generic, domain-agnostic action executor that handles sequential execution
 * of actions with comprehensive lifecycle management.
 *
 * This executor is completely independent of any specific domain (forms, workflows, etc.)
 * and can be used in any event-driven architecture.
 *
 * @template TConfig - The action configuration type
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 *
 * @example
 * ```typescript
 * const registry: ActionRegistryProvider<MyContext, MyTrigger> = new MyRegistry();
 * const executor = new ActionExecutor(registry, { debug: true });
 *
 * const results = await executor.execute({
 *   actions,
 *   trigger: 'submit',
 *   context: { formId: '123', data: {} },
 * });
 * ```
 */
export class ActionExecutor<TBaseContext = unknown, TTrigger = string> {
	private registry: ActionRegistryProvider<TBaseContext, TTrigger>;
	private debug: boolean;

	constructor(registry: ActionRegistryProvider<TBaseContext, TTrigger>, options: ActionExecutorOptions = {}) {
		this.registry = registry;
		this.debug = options.debug ?? false;
	}

	private log(level: 'debug' | 'warn' | 'error', message: string, data?: unknown): void {
		if (!this.debug) return;

		const prefix = '[ActionExecutor]';
		if (data !== undefined) {
			console[level](`${prefix} ${message}`, data);
		} else {
			console[level](`${prefix} ${message}`);
		}
	}

	/**
	 * Execute actions for a specific trigger
	 *
	 * Actions are executed sequentially (not in parallel) to maintain predictable order
	 * and allow one action to affect the next.
	 *
	 * @param actions - Array of action configurations to potentially execute
	 * @param trigger - The trigger/event that is causing execution
	 * @param context - Domain-specific context data
	 * @param triggeredBy - Reference to the action that triggered this execution (for nested execution)
	 * @returns Array of execution results
	 */
	async execute<TConfig extends ActionConfigBase>({
		actions,
		trigger,
		context,
		triggeredBy,
	}: ActionExecuteInput<TConfig, TBaseContext, TTrigger>): Promise<ActionExecutionResult[]> {
		this.log('debug', `Executing trigger: ${String(trigger)}`, {
			actionsCount: actions.length,
			triggeredBy: triggeredBy?.id,
		});

		const results: ActionExecutionResult[] = [];

		for (const action of actions) {
			if (action.enabled === false) {
				this.log('debug', `Skipping disabled action: ${action.id}`);
				continue;
			}

			const actionRegistration = this.registry.getAction(action.$type);
			if (!actionRegistration) {
				this.log('error', `No handler registered for action type: ${action.$type}`, {
					actionId: action.id,
					availableActions: this.registry.getActionTypes(),
				});
				results.push({
					success: false,
					error: `No handler registered for action type: ${action.$type}`,
					shouldContinue: true,
				});
				continue;
			}

			if (!this.shouldExecute(action, trigger)) {
				this.log(
					'debug',
					`Action ${action.id} (${action.$type}) doesn't respond to trigger: ${String(trigger)}`,
				);
				continue;
			}

			this.log('debug', `Executing action: ${action.id} (${action.$type})`);

			try {
				const result = await this.executeAction(action, trigger, context);
				results.push(result);

				if (result.success) {
					this.log('debug', `Action ${action.id} executed successfully`);
				} else {
					this.log('warn', `Action ${action.id} failed`, result);
				}

				if (!result.success && result.shouldContinue === false) {
					this.log('warn', `Stopping execution due to failure in action: ${action.id}`);
					break;
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				this.log('error', `Action execution failed for ${action.id}:`, {
					error: errorMessage,
				});
				results.push({
					success: false,
					error: errorMessage,
					shouldContinue: true,
				});
			}
		}

		return results;
	}

	/**
	 * Determine if an action should execute for a given trigger
	 *
	 * @param action - The action configuration
	 * @param trigger - The trigger/event
	 * @returns True if the action should execute
	 */
	private shouldExecute<TConfig extends ActionConfigBase>(action: TConfig, trigger: TTrigger): boolean {
		if ('triggers' in action && Array.isArray(action.triggers)) {
			return action.triggers.includes(trigger);
		}

		const actionRegistration = this.registry.getAction(action.$type);
		const defaultTriggers = actionRegistration?.metadata?.defaultTriggers ?? [];
		return defaultTriggers.includes(trigger);
	}

	/**
	 * Execute a single action
	 *
	 * @param action - The action configuration
	 * @param trigger - The trigger that caused this execution
	 * @param context - Domain-specific context data
	 * @returns Execution result
	 */
	private async executeAction<TConfig extends ActionConfigBase>(
		action: TConfig,
		trigger: TTrigger,
		context: TBaseContext,
	): Promise<ActionExecutionResult> {
		const actionRegistration = this.registry.getAction(action.$type) as
			| ActionRegistration<TConfig, TBaseContext, TTrigger>
			| undefined;
		if (!actionRegistration) {
			return {
				success: false,
				error: `No handler registered for action type: ${action.$type}`,
				shouldContinue: true,
			};
		}

		try {
			return await actionRegistration.execute({
				...context,
				config: action,
				trigger,
			});
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				shouldContinue: true,
			};
		}
	}
}
