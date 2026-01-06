import { FormProvider as RHFFormProvider, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger, BuilderActionExecutionContext } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/actions';

type BaseFormContext = Omit<BuilderActionExecutionContext, 'config' | 'trigger'>;
import type { FormProviderProps } from '../types';
import { useActionDispatcher } from '@/hooks/use-action-dispatcher';
import { useFormEngine } from '@/hooks/use-form-context';
import { useFormValidationResolver } from './hooks/use-form-validation-resolver';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';
import { useRHFMultiStep } from './hooks/use-rhf-multi-step';
import { useSubmissionStateManager } from '@/hooks/use-submission-state';

/**
 * React Hook Form adapter implementation
 */
export function FormProvider({
	config,
	defaultValues = {},
	children,
	onSubmit,
	onChange,
	onAction,
}: FormProviderProps) {
	const { engine } = useFormEngine();
	const actionExecutor = useActionDispatcher(engine);
	const { submissionState, setSubmissionPending, setSubmissionSuccess, setSubmissionError, clearSubmission } =
		useSubmissionStateManager();

	const allFields = useMemo(() => {
		return config.steps.flatMap((step) => step.elements || []);
	}, [config.steps]);

	const formDefaultValues = useMemo(() => {
		const fieldDefaults = allFields.reduce(
			(acc, field) => {
				if (field.defaultValue !== undefined) {
					acc[field.name] = field.defaultValue;
				}
				return acc;
			},
			{} as Record<string, any>,
		);

		return { ...fieldDefaults, ...defaultValues };
	}, [allFields, defaultValues]);

	const formValidationResolver = useFormValidationResolver(allFields);

	const form = useForm({
		resolver: formValidationResolver,
		defaultValues: formDefaultValues,
		mode: config.validationMode || 'onBlur',
		reValidateMode: config.reValidateMode || 'onChange',
	});

	const buildActionContext = useCallback((): BaseFormContext => {
		const formData = form.getValues();
		const formState = form.formState;

		return {
			formId: config.id || 'unnamed-form',
			formData,
			currentStep: 0,
			totalSteps: config.steps.length,
			isValid: formState.isValid,
			errors: formState.errors,
			form,
			metadata: {
				stepStartTime: Date.now(),
				totalFormTime: Date.now() - Date.now(),
				userInteractions: formState.submitCount + Object.keys(formState.touchedFields).length,
			},
		};
	}, [form, config.id, config.steps.length]);

	const dispatchTrigger = useCallback(
		async (
			trigger: FormActionTrigger,
			extraMetadata?: Record<string, unknown>,
		): Promise<ActionExecutionResult[]> => {
			return actionExecutor.dispatch(config.actions || [], trigger, buildActionContext(), extraMetadata);
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	const dispatchTriggerSync = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => {
			actionExecutor.dispatchSync(config.actions || [], trigger, buildActionContext(), extraMetadata);
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	const multiStep = useRHFMultiStep(config, form as any, dispatchTrigger);

	/**
	 * Execute 'form_mount' actions on mount
	 * This effect runs only once when the component mounts
	 */
	useEffect(() => {
		if (!config.actions || config.actions.length === 0) {
			return;
		}

		const runMount = async () => {
			try {
				await dispatchTrigger('form_mount');
			} catch (error) {
				console.error('Form mount action execution failed:', error);
			}
		};

		void runMount();
	}, [config.actions, dispatchTrigger]);

	const executeAction = useCallback(
		async (action: FormActionConfig) => {
			setSubmissionPending();
			return dispatchTrigger('form_submit')
				.then(async (results) => {
					const result = results[0] || { success: false, error: 'No result returned' };

					if (result.success) {
						await onAction?.(action, form.getValues());
						setSubmissionSuccess();
					} else {
						setSubmissionError({
							errors: [{ actionId: action.id, message: result.error || 'Unknown action error' }],
						});
					}
					return result;
				})
				.catch((error) => {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					setSubmissionError({ errors: [{ actionId: action.id, message: errorMessage }] });
					return { success: false, error: errorMessage };
				});
		},
		[form, onAction, dispatchTrigger, setSubmissionPending, setSubmissionSuccess, setSubmissionError],
	);

	const handleFormChange = useCallback(
		async (data: any) => {
			if (config.actions && config.actions.length > 0) {
				await dispatchTrigger('form_change').catch((error) => {
					console.error('Form change action execution failed:', error);
				});
			}

			if (onChange) onChange(data);

			if (config.onChange) config.onChange(data);
		},
		[config, onChange, dispatchTrigger],
	);

	/**
	 * Watch form changes and trigger form_change actions
	 */
	const watchedData = useWatch({ control: form.control });
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		if (watchedData && Object.keys(watchedData).length > 0) {
			void handleFormChange(watchedData);
		}
	}, [watchedData, handleFormChange]);

	const handleSubmit = useCallback(
		async (data: any) => {
			await form.trigger();
			setSubmissionPending();

			if (config.actions && config.actions.length > 0) {
				try {
					await dispatchTrigger('form_submit_start');

					const results = await dispatchTrigger('form_submit');

					// Collect all failed actions for error reporting
					const failedActions = results.filter(
						(result: any) => !result.success && result.shouldContinue === false,
					);

					if (failedActions.length > 0) {
						setSubmissionError({
							errors: failedActions.map((r: any, i: number) => ({
								actionId: `action-${i}`,
								message: r.error || 'Action execution failed',
							})),
						});
						await dispatchTrigger('form_submit_error');
						await dispatchTrigger('form_submit_complete');
						return;
					}

					await dispatchTrigger('form_submit_success');
					await dispatchTrigger('form_submit_complete');
					setSubmissionSuccess();
				} catch (error) {
					console.error('Form action execution failed:', error);
					setSubmissionError({
						errors: [
							{ actionId: 'unknown', message: error instanceof Error ? error.message : 'Unknown error' },
						],
					});
					await dispatchTrigger('form_submit_error');
					await dispatchTrigger('form_submit_complete');
					return;
				}
			} else {
				setSubmissionSuccess();
			}

			if (onSubmit) {
				await onSubmit(data);
			}
			if (config.onSubmit) {
				await config.onSubmit(data);
			}
		},
		[config, onSubmit, form, dispatchTrigger, setSubmissionPending, setSubmissionSuccess, setSubmissionError],
	);

	const formInstanceContextValue: FormInstanceContextValue = useMemo(
		() => ({
			executeAction,
			handleFormChange,
			currentStep: multiStep.currentStepIndex,
			totalSteps: config.steps.length,
			goToStep: (step: number) => {
				void multiStep.navigation.goToStep(step);
			},
			goToNext: () => {
				void multiStep.navigation.goToNextStep();
			},
			goToPrevious: () => {
				void multiStep.navigation.goToPreviousStep();
			},
			stepStates: multiStep.stepStates,
			navigation: {
				canGoNext: multiStep.currentStepIndex < config.steps.length - 1,
				canGoPrevious: multiStep.currentStepIndex > 0,
				isFirstStep: multiStep.currentStepIndex === 0,
				isLastStep: multiStep.currentStepIndex === config.steps.length - 1,
				goToStep: (step: number) => {
					void multiStep.navigation.goToStep(step);
				},
				goToNextStep: () => {
					void multiStep.navigation.goToNextStep();
				},
				goToPreviousStep: () => {
					void multiStep.navigation.goToPreviousStep();
				},
			},
			dispatchTrigger,
			dispatchTriggerSync,
			submissionState,
			clearSubmission,
		}),
		[
			executeAction,
			handleFormChange,
			multiStep,
			config.steps.length,
			dispatchTrigger,
			dispatchTriggerSync,
			submissionState,
			clearSubmission,
		],
	);

	return (
		<RHFFormProvider {...form}>
			<FormInstanceContext.Provider value={formInstanceContextValue}>
				<form
					onSubmit={form.handleSubmit(handleSubmit)}
					className={config.className}
					style={config.style}
					noValidate
				>
					{children}
				</form>
			</FormInstanceContext.Provider>
		</RHFFormProvider>
	);
}
