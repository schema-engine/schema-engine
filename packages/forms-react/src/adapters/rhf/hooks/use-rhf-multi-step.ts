import { useCallback, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
	collectStepFieldPaths,
	createInitialStepStates,
	createStepMachine,
	type StepMachineAction,
	type StepMachineState,
	type StepStates,
	type FormActionTrigger,
	type ActionExecutionResult,
	type FormConfigView,
} from '@schema-engine/forms';
import { logger } from '@/lib/logger';

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

export function useRHFMultiStep(
	config: FormConfigView,
	form: UseFormReturn,
	dispatchTrigger: DispatchTrigger,
	options?: { onStepIndexChange?: (index: number) => void },
): MultiStepContextValue {
	const totalSteps = config.steps.length;
	const reduce = useMemo(() => createStepMachine(config), [config]);
	const [state, setState] = useState<StepMachineState>(() => ({
		...createInitialStepStates(totalSteps),
		currentStepIndex: 0,
	}));
	const stateRef = useRef(state);
	const navigating = useRef(false);
	const onStepIndexChange = options?.onStepIndexChange;

	const validateStep = useCallback(
		async (index: number) => {
			const names = collectStepFieldPaths(config.steps[index], form.getValues());
			if (!names.length) return true;
			try {
				const valid = await form.trigger(names);
				if (!valid) {
					const firstInvalid = names.find((name) => form.getFieldState(name).invalid);
					if (firstInvalid) form.setFocus(firstInvalid);
				}
				return valid;
			} catch (error) {
				logger.error('Validation error:', error);
				return false;
			}
		},
		[config.steps, form],
	);

	const navigate = useCallback(
		async (action: Exclude<StepMachineAction, { type: 'next' }> | { type: 'next' }) => {
			if (navigating.current) return;
			navigating.current = true;
			try {
				const previous = stateRef.current;
				const next = reduce(
					previous,
					action.type === 'next'
						? { type: 'next', isValid: await validateStep(previous.currentStepIndex) }
						: action,
				);
				if (next.currentStepIndex !== previous.currentStepIndex) {
					await dispatchTrigger('step_leave');
					stateRef.current = next;
					setState(next);
					onStepIndexChange?.(next.currentStepIndex);
					await dispatchTrigger('step_change');
					await dispatchTrigger('step_enter');
				} else {
					stateRef.current = next;
					setState(next);
				}
			} finally {
				navigating.current = false;
			}
		},
		[reduce, dispatchTrigger, onStepIndexChange, validateStep],
	);

	const goToStep = useCallback((index: number) => void navigate({ type: 'go-to', index }), [navigate]);
	const goToPrevious = useCallback(() => void navigate({ type: 'previous' }), [navigate]);
	const goToNext = useCallback(() => void navigate({ type: 'next' }), [navigate]);
	const { currentStepIndex, ...stepStates } = state;
	return {
		currentStep: currentStepIndex,
		totalSteps,
		stepStates,
		goToStep,
		goToNext,
		goToPrevious,
		navigation: {
			canGoNext: currentStepIndex < totalSteps - 1,
			canGoPrevious: currentStepIndex > 0,
			isFirstStep: currentStepIndex === 0,
			isLastStep: currentStepIndex === totalSteps - 1,
			goToStep,
			goToNextStep: goToNext,
			goToPreviousStep: goToPrevious,
		},
	};
}
