import { useCallback, useMemo, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { ActionExecutionContext, ActionExecutionResult, FormActionTrigger } from '@schema-engine/forms';
import { logger } from '@/lib/logger';

type StepStates = {
	completed: boolean[];
	valid: boolean[];
	visited: boolean[];
};

type RHFMultiStepNavigation = {
	goToStep: (stepIndex: number) => Promise<void>;
	goToNextStep: () => Promise<void>;
	goToPreviousStep: () => Promise<void>;
};

export type RHFMultiStepController = {
	currentStepIndex: number;
	stepStates: StepStates;
	navigation: RHFMultiStepNavigation;
};

type DispatchTrigger = (
	trigger: Extract<FormActionTrigger, 'step_change' | 'step_enter' | 'step_leave'>,
	extraMetadata?: Record<string, unknown>,
) => Promise<ActionExecutionResult[]>;

export function useRHFMultiStep(
	config: FormConfig,
	form: UseFormReturn<FieldValues, any, undefined>,
	dispatchTrigger: DispatchTrigger,
): RHFMultiStepController {
	const { trigger, setFocus, formState, getValues } = form;

	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [stepStates, setStepStates] = useState<StepStates>(() => ({
		completed: config.steps.map(() => false),
		valid: config.steps.map(() => false),
		visited: config.steps.map(() => false),
	}));

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
		async (
			triggerName: Extract<FormActionTrigger, 'step_change' | 'step_enter' | 'step_leave'>,
			stepIndex: number,
		) => {
			if (!config.actions || config.actions.length === 0) {
				return;
			}

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

			await dispatchTrigger(triggerName, context.metadata);
		},
		[config.actions, config.id, config.steps.length, getValues, formState, form, dispatchTrigger],
	);

	const goToStep = useCallback(
		async (stepIndex: number) => {
			if (stepIndex < 0 || stepIndex >= config.steps.length) {
				return;
			}

			const previousStepIndex = currentStepIndex;

			await executeStepTrigger('step_leave', previousStepIndex);

			setCurrentStepIndex(stepIndex);
			setStepStates((prev) => ({
				...prev,
				visited: prev.visited.map((v, i) => (i === stepIndex ? true : v)),
			}));

			logger.debug(`Navigated to step ${stepIndex}: ${config.steps[stepIndex]?.title}`);

			await executeStepTrigger('step_change', stepIndex);
			await executeStepTrigger('step_enter', stepIndex);
		},
		[config.steps, currentStepIndex, executeStepTrigger],
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

	const navigation: RHFMultiStepNavigation = useMemo(
		() => ({
			goToStep,
			goToNextStep,
			goToPreviousStep,
		}),
		[goToStep, goToNextStep, goToPreviousStep],
	);

	return {
		currentStepIndex,
		stepStates,
		navigation,
	};
}
