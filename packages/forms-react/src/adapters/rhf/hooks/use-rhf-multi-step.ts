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
	type StepNavigator,
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
 * and callbacks are read through a ref. Unmounting, which a replaced config causes, cancels the
 * navigation in flight so it dispatches no step trigger for the discarded form.
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

	/**
	 * @remarks
	 * React Hook Form applies `reValidateMode` only after a submit, and a step check is a `trigger`,
	 * not a submit. Without this, an error a failed step check left stays until the field blurs,
	 * and on mousedown of Next that blur removes the error text, shifts the button and loses the click.
	 * Once a step check has failed, a field that has an error is validated again on every change, as
	 * it is after a failed submit. After a submit React Hook Form already does that, so the extra
	 * `trigger` is skipped there and async rules do not run twice. A reset, which React Hook Form
	 * reports without a field name, clears the flag.
	 */
	const stepCheckFailed = useRef(false);
	useEffect(() => {
		const subscription = form.watch((_values, { name }) => {
			if (!name) {
				stepCheckFailed.current = false;
				return;
			}
			if (stepCheckFailed.current && !form.formState.isSubmitted && form.getFieldState(name).invalid) {
				void form.trigger(name);
			}
		});
		return () => subscription.unsubscribe();
	}, [form]);

	const validateStep = useCallback(
		async (index: number) => {
			const names = collectStepFieldPaths(config.steps[index], form.getValues());
			if (!names.length) return true;
			try {
				const valid = await form.trigger(names);
				if (!valid) {
					stepCheckFailed.current = true;
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

	const navigator = useRef<StepNavigator | undefined>(undefined);
	useEffect(() => () => navigator.current?.cancel(), []);
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
		void navigator.current.navigate(action);
	}, []);

	const goToStep = useCallback((index: number) => navigate({ type: 'go-to', index }), [navigate]);
	const goToPrevious = useCallback(() => navigate({ type: 'previous' }), [navigate]);
	const goToNext = useCallback(() => navigate({ type: 'next' }), [navigate]);
	const { currentStepIndex, completed, valid, visited } = state;
	const stepStates = useMemo(() => ({ completed, valid, visited }), [completed, valid, visited]);
	const navigation = useMemo(
		() => ({
			canGoNext: currentStepIndex < totalSteps - 1,
			canGoPrevious: currentStepIndex > 0,
			isFirstStep: currentStepIndex === 0,
			isLastStep: currentStepIndex === totalSteps - 1,
			goToStep,
			goToNextStep: goToNext,
			goToPreviousStep: goToPrevious,
		}),
		[currentStepIndex, totalSteps, goToStep, goToNext, goToPrevious],
	);
	return {
		currentStep: currentStepIndex,
		totalSteps,
		stepStates,
		goToStep,
		goToNext,
		goToPrevious,
		navigation,
	};
}
