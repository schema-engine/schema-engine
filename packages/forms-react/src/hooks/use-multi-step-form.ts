import { useState, useCallback } from 'react';
import { useFormContext, type UseFormReturn, type FieldValues } from 'react-hook-form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { useActionExecutor } from './use-action-executor';
import { useFormEngine } from './use-form-context';
import { logger } from '@/lib/logger';
import type { ActionExecutionContext } from '@schema-engine/forms';

export function useMultiStepForm(config: FormConfig, formInstance?: UseFormReturn<FieldValues, any, undefined>) {
	const contextForm = useFormContext();
	const form = formInstance || contextForm;
	const { trigger, setFocus, formState, getValues } = form;
	const { engine } = useFormEngine();
	const actionExecutor = useActionExecutor(engine);

	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [stepStates, setStepStates] = useState({
		completed: config.steps.map(() => false),
		valid: config.steps.map(() => false),
		visited: config.steps.map(() => false),
	});

	const validateStep = useCallback(
		async (stepIndex: number): Promise<boolean> => {
			const step = config.steps[stepIndex];
			if (!step?.elements) return true;

			const fieldNames = step.elements.map((field) => field.name);

			try {
				const isValid = await trigger(fieldNames);

				if (!isValid) {
					const fieldsWithErrors = fieldNames.filter((fieldName) => formState.errors[fieldName]);

					if (fieldsWithErrors.length > 0) {
						setFocus(fieldsWithErrors[0]);
						logger.debug(`Validation failed. Focused on field: ${fieldsWithErrors[0]}`);
					}
				}

				setStepStates((prev) => ({
					...prev,
					valid: prev.valid.map((v, i) => (i === stepIndex ? isValid : v)),
				}));

				return isValid;
			} catch (error) {
				logger.error('Validation error:', error as Error);
				return false;
			}
		},
		[config.steps, trigger, setFocus, formState.errors],
	);

	const executeStepTrigger = useCallback(
		async (triggerName: 'step_change' | 'step_enter' | 'step_leave', stepIndex: number) => {
			if (config.actions && config.actions.length > 0) {
				try {
					const context: ActionExecutionContext = {
						formId: config.id || 'unnamed-form',
						formData: getValues(),
						currentStep: stepIndex,
						totalSteps: config.steps.length,
						isValid: formState.isValid,
						errors: formState.errors,
						form,
						metadata: {
							stepStartTime: Date.now(),
							totalFormTime: 0,
							userInteractions: formState.submitCount + Object.keys(formState.touchedFields).length,
						},
					};
					await actionExecutor.executeTrigger(config.actions, triggerName, context);
				} catch (error) {
					logger.error(`Failed to execute ${triggerName} actions:`, error as Error);
				}
			}
		},
		[config.actions, config.id, config.steps.length, getValues, formState, form, actionExecutor],
	);

	const goToStep = useCallback(
		async (stepIndex: number) => {
			if (stepIndex >= 0 && stepIndex < config.steps.length) {
				const previousStepIndex = currentStepIndex;

				// Fire step_leave for previous step
				await executeStepTrigger('step_leave', previousStepIndex);

				setCurrentStepIndex(stepIndex);
				setStepStates((prev) => ({
					...prev,
					visited: prev.visited.map((v, i) => (i === stepIndex ? true : v)),
				}));
				logger.debug(`Navigated to step ${stepIndex}: ${config.steps[stepIndex]?.title}`);

				// Fire step_change and step_enter for new step
				await executeStepTrigger('step_change', stepIndex);
				await executeStepTrigger('step_enter', stepIndex);
			}
		},
		[config.steps, executeStepTrigger, currentStepIndex],
	);

	const goToNextStep = useCallback(async () => {
		const isValid = await validateStep(currentStepIndex);
		if (isValid && currentStepIndex < config.steps.length - 1) {
			setStepStates((prev) => ({
				...prev,
				completed: prev.completed.map((c, i) => (i === currentStepIndex ? true : c)),
			}));
			await goToStep(currentStepIndex + 1);
		}
	}, [currentStepIndex, config.steps.length, validateStep, goToStep]);

	const goToPreviousStep = useCallback(async () => {
		if (currentStepIndex > 0) {
			await goToStep(currentStepIndex - 1);
		}
	}, [currentStepIndex, goToStep]);

	return {
		currentStepIndex,
		stepStates,
		navigation: {
			canGoNext: currentStepIndex < config.steps.length - 1,
			canGoPrevious: currentStepIndex > 0,
			isFirstStep: currentStepIndex === 0,
			isLastStep: currentStepIndex === config.steps.length - 1,
			goToStep,
			goToNextStep,
			goToPreviousStep,
		},
	};
}
