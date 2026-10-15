import { FormProvider as RHFFormProvider, useForm } from 'react-hook-form';
import { useCallback, useMemo, useRef } from 'react';
import type { FormProviderProps } from '../types';
import { ActionDispatcher } from '@schema-engine/forms/actions';
import { collectFieldDefaults, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { useFormEngine } from '@/hooks/use-form-context';
import { useFormValidationResolver } from './hooks/use-form-validation-resolver';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';
import { FormStepStateContext } from '@/components/form-step-state-context';
import { useRHFMultiStep } from './hooks/use-rhf-multi-step';
import { useSubmissionStateManager } from '@/hooks/use-submission-state';
import { useFormDefaultValues } from './hooks/use-form-default-values';
import { useFormActionDispatchers } from './hooks/use-form-action-dispatchers';
import { useFormMountEffect } from './hooks/use-form-mount-effect';
import { useFormWatcher } from './hooks/use-form-watcher';
import { useFormSubmitHandler } from './hooks/use-form-submit-handler';
import { useValidationDependencies } from './hooks/use-validation-dependencies';

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
	const actionExecutor = useMemo(() => new ActionDispatcher(engine), [engine]);
	const submission = useSubmissionStateManager();

	const formElements = useMemo(() => flattenStepElements(config.steps), [config.steps]);
	const fieldDefaults = useMemo(
		() => collectFieldDefaults(formElements, defaultValues),
		[formElements, defaultValues],
	);
	const formDefaultValues = useFormDefaultValues(fieldDefaults, defaultValues);
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
		config,
		actionExecutor,
		getCurrentStep,
	});

	const multiStep = useRHFMultiStep(config, form, actionDispatchers.dispatchTrigger, {
		onStepIndexChange: (index) => {
			currentStepRef.current = index;
		},
	});

	useFormMountEffect({
		actions: config.actions,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

	useValidationDependencies(form, formElements);

	useFormWatcher({
		control: form.control,
		config,
		onChange,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

	const { handleSubmit, ...submissionContext } = useFormSubmitHandler({
		form,
		config,
		submission,
		actionExecutor,
		buildActionContext: actionDispatchers.buildActionContext,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
		onSubmit,
		onAction,
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
						className={config.className}
						style={config.style}
						noValidate
					>
						{children}
					</form>
				</FormStepStateContext.Provider>
			</FormInstanceContext.Provider>
		</RHFFormProvider>
	);
}
