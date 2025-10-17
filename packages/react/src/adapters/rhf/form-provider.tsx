import { FormProvider as RHFFormProvider, useForm } from 'react-hook-form';
import { useCallback, useMemo, useState } from 'react';
import type { FormActionConfig } from '@json-form-engine/core/schemas';
import type { ActionExecutionContext } from '@json-form-engine/core';
import type { FormProviderProps } from '../types';
import { useActionExecutor } from '@/hooks/use-action-executor';
import { useFormEngine } from '@/hooks/use-form-context';
import { useFormValidationResolver } from './hooks/use-form-validation-resolver';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';

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
	const [currentStep, setCurrentStep] = useState(0);
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
			currentStep,
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
	}, [form, config.id, config.steps.length, currentStep]);

	const executeAction = useCallback(
		async (action: FormActionConfig) => {
			try {
				const context = buildActionContext();
				const results = await actionExecutor.executeTrigger([action], 'form_submit', context);
				const result = results[0] || { success: false, error: 'No result returned' };

				if (result.success) {
					onAction?.(action, form.getValues());
				} else {
					onValidationError?.({ _actionError: result.error || 'Unknown action error' });
				}
				return result;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				onValidationError?.({ _actionError: errorMessage });
				return { success: false, error: errorMessage };
			}
		},
		[buildActionContext, form, onAction, onValidationError, actionExecutor],
	);

	const handleFormChange = useCallback(
		async (data: any) => {
			if (config.actions && config.actions.length > 0) {
				try {
					const context = buildActionContext();
					await actionExecutor.executeTrigger(config.actions, 'form_change', context);
				} catch (error) {
					console.error('Form change action execution failed:', error);
				}
			}

			if (onChange) onChange(data);

			if (config.onChange) config.onChange(data);
		},
		[config.actions, config.onChange, onChange, buildActionContext, actionExecutor],
	);

	const handleSubmit = useCallback(
		async (data: any) => {
			await form.trigger();

			if (config.actions && config.actions.length > 0) {
				try {
					const context = buildActionContext();
					const results = await actionExecutor.executeTrigger(config.actions, 'form_submit', context);

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
		[config.actions, config.onSubmit, onSubmit, buildActionContext, onValidationError, actionExecutor, form],
	);

	const formInstanceContextValue: FormInstanceContextValue = useMemo(
		() => ({
			executeAction,
			handleFormChange,
			currentStep,
			totalSteps: config.steps.length,
			goToStep: (step: number) => setCurrentStep(step),
			goToNext: () => setCurrentStep((s) => Math.min(s + 1, config.steps.length - 1)),
			goToPrevious: () => setCurrentStep((s) => Math.max(s - 1, 0)),
		}),
		[executeAction, handleFormChange, currentStep, config.steps.length],
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
