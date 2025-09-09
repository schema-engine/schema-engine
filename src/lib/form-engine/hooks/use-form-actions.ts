import { Logger } from '@ecopages/logger';
import { useCallback, useEffect, useRef } from 'react';
import { useActionExecutor } from './use-action-executor';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { ActionTrigger, ActionExecutionContext, FormActionConfig } from '../actions/types';
import type { FormConfig } from '../types/form';

const logger = new Logger('[form-engine/hooks]', {
	debug: false,
});

/**
 * React hook for managing form actions with the new simplified system
 */
export function useFormActions(formConfig: FormConfig, form: UseFormReturn<FieldValues>, currentStep = 0) {
	const actionExecutor = useActionExecutor();

	const metadataRef = useRef({
		stepStartTime: Date.now(),
		totalFormTime: Date.now(),
		userInteractions: 0,
	});

	const createContext = useCallback((): ActionExecutionContext => {
		try {
			const formData = form.getValues();
			const errors = form.formState.errors;
			const isValid = form.formState.isValid;

			const sanitizedFormData: Record<string, any> = {};
			for (const [key, value] of Object.entries(formData)) {
				if (
					value === null ||
					value === undefined ||
					typeof value === 'string' ||
					typeof value === 'number' ||
					typeof value === 'boolean' ||
					Array.isArray(value)
				) {
					sanitizedFormData[key] = value;
				}
			}

			const sanitizedErrors: Record<string, any> = {};
			for (const [key, error] of Object.entries(errors)) {
				if (error && typeof error === 'object' && 'message' in error) {
					sanitizedErrors[key] = { message: error.message };
				}
			}

			return {
				formData: sanitizedFormData,
				formId: formConfig.id,
				currentStep,
				totalSteps: formConfig.steps?.length || 1,
				isValid,
				errors: sanitizedErrors,
				form,
				metadata: {
					stepStartTime: metadataRef.current.stepStartTime,
					totalFormTime: Date.now() - metadataRef.current.totalFormTime,
					userInteractions: metadataRef.current.userInteractions,
				},
			};
		} catch (err) {
			logger.warn('Failed to create context:', err instanceof Error ? err.message : String(err));
			return {
				formData: {},
				formId: formConfig.id,
				currentStep,
				totalSteps: formConfig.steps?.length || 1,
				isValid: false,
				errors: { _contextError: 'Failed to create context' },
				form,
				metadata: {
					stepStartTime: metadataRef.current.stepStartTime,
					totalFormTime: Date.now() - metadataRef.current.totalFormTime,
					userInteractions: metadataRef.current.userInteractions,
				},
			};
		}
	}, [formConfig.id, formConfig.steps?.length, form, currentStep]);

	const executeTrigger = useCallback(
		async (trigger: ActionTrigger) => {
			const context = createContext();
			const allActions: FormActionConfig[] = [];

			if (formConfig.actions) {
				allActions.push(...formConfig.actions);
				logger.debug(`Added ${formConfig.actions.length} global actions for trigger: ${trigger}`);
			}

			const stepActions = formConfig.steps?.[currentStep]?.actions;
			if (stepActions) {
				allActions.push(...stepActions);
				logger.debug(`Added ${stepActions.length} step actions for step ${currentStep}, trigger: ${trigger}`);
			}

			logger.debug(`Executing trigger: ${trigger}`, {
				totalActions: allActions.length,
				formId: formConfig.id,
				currentStep,
				isValid: context.isValid,
			});

			return actionExecutor.executeTrigger(allActions, trigger, context);
		},
		[formConfig.actions, formConfig.steps, currentStep, createContext, formConfig.id, actionExecutor],
	);

	const trackInteraction = useCallback(() => {
		metadataRef.current.userInteractions++;
		logger.debug(`User interaction tracked (total: ${metadataRef.current.userInteractions})`);
	}, []);

	const previousStep = useRef(currentStep);
	useEffect(() => {
		if (previousStep.current !== currentStep) {
			logger.debug(`Step changed from ${previousStep.current} to ${currentStep}`);
			metadataRef.current.stepStartTime = Date.now();
			previousStep.current = currentStep;
		}
	}, [currentStep]);

	const hasTriggeredFormStart = useRef<Set<string>>(new Set());

	useEffect(() => {
		const formKey = `${formConfig.id}_${JSON.stringify(
			formConfig.actions?.map((a: FormActionConfig) => a.id) || [],
		)}_${formConfig.steps?.length || 0}`;

		if (!hasTriggeredFormStart.current.has(formKey)) {
			logger.debug(`Initializing form actions for: ${formConfig.id}`);

			const initContext: ActionExecutionContext = {
				formData: {},
				formId: formConfig.id,
				currentStep: 0,
				totalSteps: formConfig.steps?.length || 1,
				isValid: true,
				errors: {},
				form,
				metadata: {
					stepStartTime: metadataRef.current.stepStartTime,
					totalFormTime: 0,
					userInteractions: 0,
				},
			};

			const allActions: FormActionConfig[] = [];

			if (formConfig.actions) {
				allActions.push(...formConfig.actions);
			}

			const stepActions = formConfig.steps?.[0]?.actions;
			if (stepActions) {
				allActions.push(...stepActions);
			}

			actionExecutor.executeTrigger(allActions, 'form_start', initContext);
			hasTriggeredFormStart.current.add(formKey);
		}
	}, [formConfig.id, formConfig.actions, formConfig.steps, form, actionExecutor]);

	useEffect(() => {
		logger.debug(`Setting up form watch for: ${formConfig.id}`);
		const subscription = form.watch(() => {
			trackInteraction();
			executeTrigger('form_change');
		});

		return () => {
			logger.debug(`Cleaning up form watch for: ${formConfig.id}`);
			subscription.unsubscribe();
		};
	}, [form, executeTrigger, trackInteraction, formConfig.id]);

	useEffect(() => {
		return () => {
			logger.debug(`Cleaning up form actions hook for: ${formConfig.id}`);
			if (actionExecutor) {
				actionExecutor.cleanup();
			}
		};
	}, [formConfig.id, actionExecutor]);

	return {
		triggerStepSubmit: () => executeTrigger('step_submit'),
		triggerFormSubmit: () => executeTrigger('form_submit'),
		triggerManualReset: () => executeTrigger('manual_reset'),
		triggerStepChange: () => executeTrigger('step_change'),
		triggerManualSave: () => executeTrigger('manual_save'),
		trackInteraction,
		executeTrigger,
		getContext: () => {
			try {
				const context = createContext();
				return {
					formId: context.formId,
					currentStep: context.currentStep,
					totalSteps: context.totalSteps,
					isValid: context.isValid,
					formDataKeys: Object.keys(context.formData),
					errorKeys: Object.keys(context.errors),
					metadata: context.metadata,
				};
			} catch (err) {
				return {
					error: 'Failed to create context',
					errorMessage: err instanceof Error ? err.message : String(err),
					formId: formConfig.id,
					currentStep,
				};
			}
		},
	};
}
