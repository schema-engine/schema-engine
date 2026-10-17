import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
	collectStepFieldPaths,
	createInitialStepStates,
	createStepMachine,
	createStepNavigator,
	type StepActionTrigger,
	type StepMachineState,
	type StepNavigationAction,
	type StepStates,
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
	trigger: StepActionTrigger,
	extraMetadata?: Record<string, unknown>,
) => Promise<ActionExecutionResult[]>;

/**
 * @remarks The navigator is created on first navigation, outside render as the React refs rule
 * requires, and lives as long as the hook, so its in-flight guard survives re-renders; the reducer
 * and callbacks are read through a ref.
 */
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

	const latest = useRef({ reduce, validateStep, dispatchTrigger, onStepIndexChange });
	useEffect(() => {
		latest.current = { reduce, validateStep, dispatchTrigger, onStepIndexChange };
	}, [reduce, validateStep, dispatchTrigger, onStepIndexChange]);

	const navigator = useRef<((action: StepNavigationAction) => Promise<void>) | undefined>(undefined);
	const navigate = useCallback((action: StepNavigationAction) => {
		navigator.current ??= createStepNavigator({
			reduce: (current, next) => latest.current.reduce(current, next),
			getState: () => stateRef.current,
			setState: (next) => {
				const indexChanged = next.currentStepIndex !== stateRef.current.currentStepIndex;
				stateRef.current = next;
				setState(next);
				if (indexChanged) latest.current.onStepIndexChange?.(next.currentStepIndex);
			},
			validateStep: (index) => latest.current.validateStep(index),
			dispatchTrigger: (trigger) => latest.current.dispatchTrigger(trigger),
		});
		void navigator.current(action);
	}, []);

	const goToStep = useCallback((index: number) => navigate({ type: 'go-to', index }), [navigate]);
	const goToPrevious = useCallback(() => navigate({ type: 'previous' }), [navigate]);
	const goToNext = useCallback(() => navigate({ type: 'next' }), [navigate]);
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
