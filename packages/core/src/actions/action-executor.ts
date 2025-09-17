import type { FormActionConfig, ActionExecutionContext, ActionExecutionResult } from './types';
import { actionRegistry } from './action-registry';
import { Logger } from '@ecopages/logger';
import type { ActionTrigger } from './triggers';

const logger = new Logger('[form-engine/actions]', { debug: false });

/**
 * Action Executor
 *
 * Handles sequential execution of actions with comprehensive lifecycle management.
 * All actions are now plugins - no core actions are hardcoded.
 * Delegates everything to the plugin registry for maximum flexibility.
 */
export class ActionExecutor {
	/**
	 * Execute actions for a specific trigger (in sequence, not parallel)
	 * @param actions - Array of actions to potentially execute
	 * @param trigger - Current trigger event
	 * @param context - Execution context
	 * @param triggeredBy - Reference to the action that triggered this execution (for lifecycle chains)
	 */
	async executeTrigger(
		actions: FormActionConfig[],
		trigger: ActionTrigger,
		context: ActionExecutionContext,
		triggeredBy?: FormActionConfig,
	): Promise<ActionExecutionResult[]> {
		logger.debug(`Executing trigger: ${trigger}`, {
			actionsCount: actions.length,
			formId: context.formId,
			currentStep: context.currentStep,
			triggeredBy: triggeredBy?.id,
		});

		const results: ActionExecutionResult[] = [];

		for (const action of actions) {
			if (action.enabled === false) {
				logger.debug(`Skipping disabled action: ${action.id}`);
				continue;
			}

			let shouldExecute = false;

			if ('triggers' in action && Array.isArray(action.triggers)) {
				shouldExecute = action.triggers.includes(trigger);
			} else {
				const registryTriggers = actionRegistry.getDefaultTriggers(action.type);
				const actionTriggers = registryTriggers ?? [];
				shouldExecute = actionTriggers.includes(trigger);
			}

			if (!shouldExecute) {
				logger.debug(`Action ${action.id} (${action.type}) doesn't respond to trigger: ${trigger}`);
				continue;
			}

			logger.debug(`Executing action: ${action.id} (${action.type})`);

			try {
				const result = await this.executeAction(action, context);
				results.push(result);

				if (result.success) {
					logger.debug(`Action ${action.id} executed successfully`);

					if (action.type === 'submit' && trigger === 'form_submit') {
						const successResults = await this.executeTrigger(
							actions,
							'submit_success',
							{
								...context,

								form: {
									...context.form,
									formState: {
										...context.form.formState,
										isSubmitting: false,
										isSubmitSuccessful: true,
									},
								},
							},
							action,
						);
						results.push(...successResults);

						const completeResults = await this.executeTrigger(
							actions,
							'submit_complete',
							{
								...context,
								form: {
									...context.form,
									formState: {
										...context.form.formState,
										isSubmitting: false,
										isSubmitSuccessful: true,
									},
								},
							},
							action,
						);
						results.push(...completeResults);
					}
				} else {
					logger.warn(`Action ${action.id} failed`, result);

					if (action.type === 'submit' && trigger === 'form_submit') {
						const errorResults = await this.executeTrigger(
							actions,
							'submit_error',
							{
								...context,
								form: {
									...context.form,
									formState: {
										...context.form.formState,
										isSubmitting: false,
										isSubmitSuccessful: false,
									},
								},
							},
							action,
						);
						results.push(...errorResults);

						const completeResults = await this.executeTrigger(
							actions,
							'submit_complete',
							{
								...context,
								form: {
									...context.form,
									formState: {
										...context.form.formState,
										isSubmitting: false,
										isSubmitSuccessful: false,
									},
								},
							},
							action,
						);
						results.push(...completeResults);
					}
				}

				if (!result.success && result.shouldContinue === false) {
					logger.warn(`Stopping action execution due to failure in action: ${action.id}`);
					break;
				}
			} catch (error) {
				logger.error(`Action execution failed for ${action.id}:`, {
					error: error instanceof Error ? error.message : String(error),
				});
				results.push({
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					shouldContinue: true,
				});
			}
		}

		return results;
	}

	/**
	 * Execute a single action by delegating to the plugin registry
	 */
	private async executeAction(
		action: FormActionConfig,
		context: ActionExecutionContext,
	): Promise<ActionExecutionResult> {
		if (actionRegistry.has(action.type)) {
			return actionRegistry.execute(action, context);
		}

		return {
			success: false,
			error: `No handler registered for action type: ${action.type}`,
			shouldContinue: true,
		};
	}

	cleanup(): void {
		logger.debug('Action executor cleanup completed');
	}
}
