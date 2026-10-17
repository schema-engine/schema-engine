import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import { FormProvider as RHFFormProvider, useForm, type FieldValues } from 'react-hook-form';
import { useCallback, useMemo, useRef } from 'react';
import type { FormProviderProps } from '../types';
import { ActionDispatcher } from '@schema-engine/forms/actions';
import { collectInitialValues, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { useFormEngine } from '@/hooks/use-form-context';
import type { FormActionConfig, FormConfigView } from '@schema-engine/forms';
import { useFormValidationResolver } from './hooks/use-form-validation-resolver';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';
import { FormStepStateContext } from '@/components/form-step-state-context';
import { useRHFMultiStep } from './hooks/use-rhf-multi-step';
import { useSubmissionStateManager } from '@/hooks/use-submission-state';
import { useFormActionDispatchers } from './hooks/use-form-action-dispatchers';
import { useFormMountEffect } from './hooks/use-form-mount-effect';
import { useFormWatcher } from './hooks/use-form-watcher';
import { useFormSubmitHandler } from './hooks/use-form-submit-handler';
import { useValidationDependencies } from './hooks/use-validation-dependencies';

/**
 * React Hook Form adapter implementation
 */
export function FormProvider<
	TFormData = Record<string, unknown>,
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>({
	config,
	defaultValues = {},
	children,
	onSubmit,
	onChange,
	onAction,
}: FormProviderProps<TFormData, TElements, TRecipes, TActions, TOutputs>) {
	const { engine } = useFormEngine<TElements, TRecipes, TActions, TOutputs>();
	const runtimeConfig = config as unknown as FormConfigView;
	const actionExecutor = useMemo(() => new ActionDispatcher(engine), [engine]);
	const submission = useSubmissionStateManager();

	const formElements = useMemo(() => flattenStepElements(runtimeConfig.steps), [runtimeConfig.steps]);
	const formDefaultValues = useMemo(
		() => collectInitialValues(formElements, defaultValues),
		[formElements, defaultValues],
	);
	const formValidationResolver = useFormValidationResolver(formElements, engine.getValidationRegistry());

	const form = useForm({
		resolver: formValidationResolver,
		defaultValues: formDefaultValues,
		mode: config.validationMode || 'onBlur',
		reValidateMode: config.reValidateMode || 'onChange',
	});

	const currentStepRef = useRef(0);
	const getCurrentStep = useCallback(() => currentStepRef.current, []);

	const actionDispatchers = useFormActionDispatchers({
		form,
		config: runtimeConfig,
		actionExecutor,
		getCurrentStep,
	});

	const multiStep = useRHFMultiStep(runtimeConfig, form, actionDispatchers.dispatchTrigger, {
		onStepIndexChange: (index) => {
			currentStepRef.current = index;
		},
	});

	useFormMountEffect({
		actions: runtimeConfig.actions,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

	useValidationDependencies(form, formElements);

	/**
	 * Adapts React Hook Form's broad value record to the provider's declared data shape.
	 *
	 * @remarks
	 * The config is normalized at runtime, so React Hook Form cannot infer the consumer's
	 * TFormData; the provider generic is the consumer contract for this callback.
	 */
	const handleFormChange = useCallback(
		(data: FieldValues) => onChange?.(data as unknown as Partial<TFormData>),
		[onChange],
	);
	const handleFormSubmit = useCallback((data: FieldValues) => onSubmit?.(data as unknown as TFormData), [onSubmit]);
	const handleFormAction = useMemo(
		() =>
			onAction &&
			((action: NonNullable<FormConfigView['actions']>[number], data: FieldValues) =>
				onAction(action as FormActionConfig<TOutputs['actions']>, data as TFormData)),
		[onAction],
	);

	useFormWatcher({
		control: form.control,
		config: runtimeConfig,
		onChange: handleFormChange,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

	const { handleSubmit, ...submissionContext } = useFormSubmitHandler({
		form,
		config: runtimeConfig,
		submission,
		actionExecutor,
		buildActionContext: actionDispatchers.buildActionContext,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
		onSubmit: handleFormSubmit,
		onAction: handleFormAction,
	});

	const { stepStates } = multiStep;
	const formInstanceContextValue: FormInstanceContextValue = useMemo(
		() => ({
			currentStep: multiStep.currentStep,
			totalSteps: multiStep.totalSteps,
			goToStep: multiStep.goToStep,
			goToNext: multiStep.goToNext,
			goToPrevious: multiStep.goToPrevious,
			navigation: multiStep.navigation,
			...actionDispatchers,
			...submissionContext,
		}),
		[multiStep, actionDispatchers, submissionContext],
	);

	return (
		<RHFFormProvider {...form}>
			<FormInstanceContext.Provider value={formInstanceContextValue}>
				<FormStepStateContext.Provider value={stepStates}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className={runtimeConfig.className}
						style={runtimeConfig.style}
						noValidate
					>
						{children}
					</form>
				</FormStepStateContext.Provider>
			</FormInstanceContext.Provider>
		</RHFFormProvider>
	);
}
