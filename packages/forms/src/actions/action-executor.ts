import type { FormActionConfig, ActionExecutionContext, ActionExecutionResult } from './types';
import { Logger } from '@ecopages/logger';
import type { FormActionTrigger } from './triggers';
import type { FormEngine } from '../engine/form-engine';

const logger = new Logger('[form-engine/actions]', { debug: false });

/**
 * Action Executor
 *
 * Handles sequential execution of actions with comprehensive lifecycle management.
 * All actions are plugins registered in the FormEngine instance.
 * No global registry - actions are fully self-contained per engine.
 */
export class ActionExecutor {
	private engine: FormEngine;

	constructor(engine: FormEngine) {
		this.engine = engine;
	}
	/**
	 * Execute actions for a specific trigger (in sequence, not parallel)
	 * @param actions - Array of actions to potentially execute
	 * @param trigger - Current trigger event
	 * @param context - Execution context
	 * @param triggeredBy - Reference to the action that triggered this execution (for lifecycle chains)
	 */
	async executeTrigger(
		actions: FormActionConfig[],
		trigger: FormActionTrigger,
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
				const actionRegistration = this.engine.getAction(action.type);
				const defaultTriggers = actionRegistration?.metadata?.defaultTriggers ?? [];
				shouldExecute = defaultTriggers.includes(trigger);
			}

			if (!shouldExecute) {
				logger.debug(`Action ${action.id} (${action.type}) doesn't respond to trigger: ${trigger}`);
				continue;
			}

			logger.debug(`Executing action: ${action.id} (${action.type})`);

			try {
				const result = await this.executeAction(action, context, trigger);
				results.push(result);

				if (result.success) {
					logger.debug(`Action ${action.id} executed successfully`);

					if (action.type === 'submit' && trigger === 'form_submit') {
						const successResults = await this.executeTrigger(
							actions,
							'form_submit_success',
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
							'form_submit_complete',
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
							'form_submit_error',
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
							'form_submit_complete',
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
	 * Execute a single action using the FormEngine's registered action handlers
	 *
	 * Transforms the React Hook Form-specific context into a framework-agnostic
	 * context that action plugins can use without depending on RHF directly.
	 */
	private async executeAction(
		action: FormActionConfig,
		context: ActionExecutionContext,
		trigger: FormActionTrigger,
	): Promise<ActionExecutionResult> {
		const actionRegistration = this.engine.getAction(action.type);

		if (!actionRegistration) {
			logger.error(`No handler registered for action type: ${action.type}`, {
				actionId: action.id,
				availableActions: this.engine.getActionTypes(),
			});

			return {
				success: false,
				error: `No handler registered for action type: ${action.type}`,
				shouldContinue: true,
			};
		}

		try {
			/**
			 * Transform RHF-specific context to framework-agnostic context.
			 * This allows action plugins to work without direct React Hook Form dependency.
			 *
			 * Note: The validate() method is provided as a utility but is NOT
			 * automatically called. Actions decide if/when to validate.
			 */
			const builderContext = {
				config: action,
				formId: context.formId,
				formData: context.formData,
				currentStep: context.currentStep,
				totalSteps: context.totalSteps,
				isValid: context.isValid,
				errors: context.errors,
				trigger,
				metadata: context.metadata,
				form: {
					reset: () => context.form.reset(),
					setValue: (name: string, value: unknown) => context.form.setValue(name, value as any),
					getValue: (name: string) => context.form.getValues(name),
					validate: async () => await context.form.trigger(),
				},
			};

			return await actionRegistration.execute(builderContext);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				shouldContinue: true,
			};
		}
	}

	cleanup(): void {
		logger.debug('Action executor cleanup completed');
	}
}
