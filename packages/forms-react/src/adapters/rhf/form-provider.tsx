import { FormProvider as RHFFormProvider, useForm } from 'react-hook-form';
import { useMemo } from 'react';
import type { FormProviderProps } from '../types';
import { useActionDispatcher } from '@/hooks/use-action-dispatcher';
import { useFormEngine } from '@/hooks/use-form-context';
import { useFormValidationResolver } from './hooks/use-form-validation-resolver';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';
import { useRHFMultiStep } from './hooks/use-rhf-multi-step';
import { useSubmissionStateManager } from '@/hooks/use-submission-state';
import { useFormDefaultValues } from './hooks/use-form-default-values';
import { useFormActionDispatchers } from './hooks/use-form-action-dispatchers';
import { useFormMountEffect } from './hooks/use-form-mount-effect';
import { useFormWatcher } from './hooks/use-form-watcher';
import { useFormSubmitHandler } from './hooks/use-form-submit-handler';

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
	const submission = useSubmissionStateManager();

	const allFields = useMemo(() => {
		return config.steps.flatMap((step) => step.elements || []);
	}, [config.steps]);

	const formDefaultValues = useFormDefaultValues(allFields, defaultValues);
	const formValidationResolver = useFormValidationResolver(allFields);

	const form = useForm({
		resolver: formValidationResolver,
		defaultValues: formDefaultValues,
		mode: config.validationMode || 'onBlur',
		reValidateMode: config.reValidateMode || 'onChange',
	});

	const actionDispatchers = useFormActionDispatchers({
		form,
		config,
		actionExecutor,
	});

	const multiStep = useRHFMultiStep(config, form, actionDispatchers.dispatchTrigger);

	useFormMountEffect({
		actions: config.actions,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

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
		dispatchTrigger: actionDispatchers.dispatchTrigger,
		onSubmit,
		onAction,
	});

	const formInstanceContextValue: FormInstanceContextValue = useMemo(
		() => ({
			...multiStep,
			...actionDispatchers,
			...submissionContext,
		}),
		[multiStep, actionDispatchers, submissionContext],
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
