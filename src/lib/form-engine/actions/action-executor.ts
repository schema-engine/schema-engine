import type {
	FormActionConfig,
	ActionExecutionContext,
	ActionExecutionResult,
	ActionTrigger,
} from "./types";
import { actionRegistry } from "./action-registry";
import { Logger } from "@ecopages/logger";

const logger = new Logger("[form-engine/actions]", { debug: false });

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
		triggeredBy?: FormActionConfig
	): Promise<ActionExecutionResult[]> {
		logger.debug(`Executing trigger: ${trigger}`, {
			actionsCount: actions.length,
			formId: context.formId,
			currentStep: context.currentStep,
			triggeredBy: triggeredBy?.id,
		});

		const results: ActionExecutionResult[] = [];

		// Sequential execution - run actions one after another
		for (const action of actions) {
			if (!action.enabled) {
				logger.debug(`Skipping disabled action: ${action.id}`);
				continue;
			}

			// Check if action should execute for this trigger
			let shouldExecute = false;

			// Check for custom triggers first
			if ("triggers" in action && Array.isArray((action as any).triggers)) {
				shouldExecute = (action as any).triggers.includes(trigger);
			} else {
				// Use default triggers from registry
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

					// Handle submit lifecycle for submit actions
					if (action.type === "submit" && trigger === "form_submit") {
						// Execute submit_success actions
						const successResults = await this.executeTrigger(
							actions,
							"submit_success",
							{
								...context,
								formState: {
									...context.formState,
									isSubmitting: false,
									isSubmitSuccessful: true,
								},
							},
							action
						);
						results.push(...successResults);

						// Execute submit_complete actions
						const completeResults = await this.executeTrigger(
							actions,
							"submit_complete",
							{
								...context,
								formState: {
									...context.formState,
									isSubmitting: false,
									isSubmitSuccessful: true,
								},
							},
							action
						);
						results.push(...completeResults);
					}
				} else {
					logger.warn(`Action ${action.id} failed`, result);

					// Handle submit error lifecycle for submit actions
					if (action.type === "submit" && trigger === "form_submit") {
						// Execute submit_error actions
						const errorResults = await this.executeTrigger(
							actions,
							"submit_error",
							{
								...context,
								formState: {
									...context.formState,
									isSubmitting: false,
									isSubmitSuccessful: false,
								},
							},
							action
						);
						results.push(...errorResults);

						// Execute submit_complete actions
						const completeResults = await this.executeTrigger(
							actions,
							"submit_complete",
							{
								...context,
								formState: {
									...context.formState,
									isSubmitting: false,
									isSubmitSuccessful: false,
								},
							},
							action
						);
						results.push(...completeResults);
					}
				}

				// Stop execution if action explicitly requests it
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
					error: error instanceof Error ? error.message : "Unknown error",
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
		context: ActionExecutionContext
	): Promise<ActionExecutionResult> {
		// All actions are now plugins - delegate to registry
		if (actionRegistry.has(action.type)) {
			return actionRegistry.execute(action, context);
		}

		return {
			success: false,
			error: `No handler registered for action type: ${action.type}`,
			shouldContinue: true,
		};
	}

	/**
	 * Cleanup any resources
	 */
	cleanup(): void {
		logger.debug("Action executor cleanup completed");
	}
}
