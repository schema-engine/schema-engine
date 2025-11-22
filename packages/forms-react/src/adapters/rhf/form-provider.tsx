import { FormProvider as RHFFormProvider, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { ActionExecutionContext, ActionExecutionResult, FormActionTrigger } from '@schema-engine/forms';
import type { FormProviderProps } from '../types';
import { useActionExecutor } from '@/hooks/use-action-executor';
import { useFormEngine } from '@/hooks/use-form-context';
import { useFormValidationResolver } from './hooks/use-form-validation-resolver';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';
import { useRHFMultiStep } from './hooks/use-rhf-multi-step';

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
	onValidationError,
}: FormProviderProps) {
	const { engine } = useFormEngine();
	const actionExecutor = useActionExecutor(engine);

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

	const buildActionContext = useCallback((): ActionExecutionContext => {
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
			return actionExecutor.dispatchTrigger(config.actions || [], trigger, buildActionContext(), extraMetadata);
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	const dispatchTriggerSync = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => {
			actionExecutor.dispatchTriggerSync(config.actions || [], trigger, buildActionContext(), extraMetadata);
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
			return dispatchTrigger('form_submit')
				.then((results) => {
					const result = results[0] || { success: false, error: 'No result returned' };

					if (result.success) {
						onAction?.(action, form.getValues());
					} else {
						onValidationError?.({ _actionError: result.error || 'Unknown action error' });
					}
					return result;
				})
				.catch((error) => {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					onValidationError?.({ _actionError: errorMessage });
					return { success: false, error: errorMessage };
				});
		},
		[form, onAction, onValidationError, dispatchTrigger],
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
		[config.actions, config.onChange, onChange, dispatchTrigger],
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
			handleFormChange(watchedData);
		}
	}, [watchedData, handleFormChange]);

	const handleSubmit = useCallback(
		async (data: any) => {
			await form.trigger();

			if (config.actions && config.actions.length > 0) {
				try {
					await dispatchTrigger('form_submit_start');

					const results = await dispatchTrigger('form_submit');

					const failedAction = results.find(
						(result: any) => !result.success && result.shouldContinue === false,
					);

					if (failedAction) {
						if (onValidationError) {
							onValidationError({ _actionError: failedAction.error || 'Action execution failed' });
						}
						return;
					}
				} catch (error) {
					console.error('Form action execution failed:', error);
					onValidationError?.({ _actionError: error instanceof Error ? error.message : 'Unknown error' });
					return;
				}
			}

			if (onSubmit) {
				onSubmit(data);
			}
			if (config.onSubmit) {
				config.onSubmit(data);
			}
		},
		[config.actions, config.onSubmit, onSubmit, onValidationError, form, dispatchTrigger],
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
		}),
		[executeAction, handleFormChange, multiStep, config.steps.length, dispatchTrigger, dispatchTriggerSync],
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
