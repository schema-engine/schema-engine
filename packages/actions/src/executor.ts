import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ActionConfigBase, ActionExecuteInput, ActionExecutionResult, ActionRegistration } from './types';
import type { ActionRegistryProvider } from './registry';

function validateActionConfig<TConfig>(
	schema: StandardSchemaV1<TConfig>,
	config: unknown,
): ActionExecutionResult | null {
	const result = schema['~standard'].validate(config);
	if (result && typeof (result as Promise<unknown>).then === 'function') {
		return {
			success: false,
			error: 'Async Standard Schema validation is not supported in this context',
			shouldContinue: true,
		};
	}

	const syncResult = result as StandardSchemaV1.Result<TConfig>;
	if (syncResult.issues?.length) {
		const issues = [...syncResult.issues];
		return {
			success: false,
			error: issues.map((issue) => issue.message).join(', '),
			issues,
			shouldContinue: true,
		};
	}

	return null;
}

/**
 * Determine if an action should execute for a given trigger.
 *
 * Custom `action.triggers` override registration defaults when present.
 */
export function shouldExecuteAction<TConfig extends ActionConfigBase, TTrigger>(
	action: TConfig,
	trigger: TTrigger,
	defaultTriggers: readonly TTrigger[] = [],
): boolean {
	if ('triggers' in action && Array.isArray(action.triggers)) {
		return action.triggers.includes(trigger);
	}

	return defaultTriggers.includes(trigger);
}

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

			const actionRegistration = this.registry.getAction(action.$type) as
				| ActionRegistration<TConfig, TBaseContext, TTrigger>
				| undefined;
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

			const defaultTriggers = actionRegistration.metadata?.defaultTriggers ?? [];
			if (!shouldExecuteAction(action, trigger, defaultTriggers)) {
				this.log(
					'debug',
					`Action ${action.id} (${action.$type}) doesn't respond to trigger: ${String(trigger)}`,
				);
				continue;
			}

			this.log('debug', `Executing action: ${action.id} (${action.$type})`);

			const result = await this.executeAction(action, trigger, context, actionRegistration, triggeredBy);
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
		}

		return results;
	}

	/**
	 * Execute a single action
	 *
	 * @param action - The action configuration
	 * @param trigger - The trigger that caused this execution
	 * @param context - Domain-specific context data
	 * @param actionRegistration - Resolved registration for the action type
	 * @returns Execution result
	 */
	private async executeAction<TConfig extends ActionConfigBase>(
		action: TConfig,
		trigger: TTrigger,
		context: TBaseContext,
		actionRegistration: ActionRegistration<TConfig, TBaseContext, TTrigger>,
		triggeredBy?: TConfig,
	): Promise<ActionExecutionResult> {
		const validationError = validateActionConfig(actionRegistration.schema, action);
		if (validationError) {
			return validationError;
		}

		try {
			return await actionRegistration.execute({
				...context,
				config: action,
				trigger,
				...(triggeredBy ? { triggeredBy } : {}),
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
