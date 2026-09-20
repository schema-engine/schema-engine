import { useCallback, useMemo, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type {
	FormActionTrigger,
	ActionExecutionResult,
	BuilderActionBaseContext,
	FormConfigView,
} from '@schema-engine/forms';
import { logger } from '@/lib/logger';

type StepStates = {
	completed: boolean[];
	valid: boolean[];
	/** Index `0` is pre-visited: the first step is visible as soon as the form mounts. */
	visited: boolean[];
};

type Navigation = {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (step: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
};

export type MultiStepContextValue = {
	currentStep: number;
	totalSteps: number;
	goToStep: (step: number) => void;
	goToNext: () => void;
	goToPrevious: () => void;
	stepStates: StepStates;
	navigation: Navigation;
};

type DispatchTrigger = (
	trigger: Extract<FormActionTrigger, 'step_change' | 'step_enter' | 'step_leave'>,
	extraMetadata?: Record<string, unknown>,
) => Promise<ActionExecutionResult[]>;

function fieldNamesForStep(step: FormConfigView['steps'][number] | undefined): string[] {
	return (step?.elements ?? [])
		.map((field) => field.name)
		.filter((name): name is string => typeof name === 'string' && name.length > 0);
}

export function useRHFMultiStep(
	config: FormConfigView,
	form: UseFormReturn<FieldValues, any, FieldValues>,
	dispatchTrigger: DispatchTrigger,
	options?: { onStepIndexChange?: (index: number) => void },
): MultiStepContextValue {
	const { trigger, setFocus, formState, getValues } = form;
	const onStepIndexChange = options?.onStepIndexChange;
	const totalSteps = config.steps.length;

	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [stepStates, setStepStates] = useState<StepStates>(() => ({
		completed: config.steps.map(() => false),
		valid: config.steps.map(() => false),
		visited: config.steps.map((_, index) => index === 0),
	}));

	const validateStep = useCallback(
		async (stepIndex: number): Promise<boolean> => {
			const fieldNames = fieldNamesForStep(config.steps[stepIndex]);
			if (fieldNames.length === 0) return true;

			try {
				const isValid = await trigger(fieldNames);

				if (!isValid) {
					const firstInvalid = fieldNames.find((fieldName) => form.getFieldState(fieldName).invalid);

					if (firstInvalid) {
						setFocus(firstInvalid);
						logger.debug(`Validation failed. Focused on field: ${firstInvalid}`);
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
		[config.steps, form, trigger, setFocus],
	);

	const executeStepTrigger = useCallback(
		async (
			triggerName: Extract<FormActionTrigger, 'step_change' | 'step_enter' | 'step_leave'>,
			stepIndex: number,
		) => {
			if (!config.actions || config.actions.length === 0) {
				return;
			}

			const context: BuilderActionBaseContext = {
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

	const goToStepAsync = useCallback(
		async (stepIndex: number) => {
			if (stepIndex < 0 || stepIndex >= config.steps.length) {
				return;
			}

			const previousStepIndex = currentStepIndex;

			await executeStepTrigger('step_leave', previousStepIndex);

			setCurrentStepIndex(stepIndex);
			onStepIndexChange?.(stepIndex);
			setStepStates((prev) => ({
				...prev,
				visited: prev.visited.map((v, i) => (i === stepIndex ? true : v)),
			}));

			logger.debug(`Navigated to step ${stepIndex}: ${config.steps[stepIndex]?.title}`);

			await executeStepTrigger('step_change', stepIndex);
			await executeStepTrigger('step_enter', stepIndex);
		},
		[config.steps, currentStepIndex, executeStepTrigger, onStepIndexChange],
	);

	const goToNextStepAsync = useCallback(async () => {
		const isValid = await validateStep(currentStepIndex);
		if (isValid && currentStepIndex < config.steps.length - 1) {
			setStepStates((prev) => ({
				...prev,
				completed: prev.completed.map((c, i) => (i === currentStepIndex ? true : c)),
			}));
			await goToStepAsync(currentStepIndex + 1);
		}
	}, [currentStepIndex, config.steps.length, validateStep, goToStepAsync]);

	const goToPreviousStepAsync = useCallback(async () => {
		if (currentStepIndex > 0) {
			await goToStepAsync(currentStepIndex - 1);
		}
	}, [currentStepIndex, goToStepAsync]);

	return useMemo(
		() => ({
			currentStep: currentStepIndex,
			totalSteps,
			goToStep: (step: number) => void goToStepAsync(step),
			goToNext: () => void goToNextStepAsync(),
			goToPrevious: () => void goToPreviousStepAsync(),
			stepStates,
			navigation: {
				canGoNext: currentStepIndex < totalSteps - 1,
				canGoPrevious: currentStepIndex > 0,
				isFirstStep: currentStepIndex === 0,
				isLastStep: currentStepIndex === totalSteps - 1,
				goToStep: (step: number) => void goToStepAsync(step),
				goToNextStep: () => void goToNextStepAsync(),
				goToPreviousStep: () => void goToPreviousStepAsync(),
			},
		}),
		[currentStepIndex, totalSteps, stepStates, goToStepAsync, goToNextStepAsync, goToPreviousStepAsync],
	);
}
