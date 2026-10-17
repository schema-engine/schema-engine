import type { FormActionTrigger } from '@/actions';

/** Per-step completion, validity, and visitation state. */
export interface StepStates {
	completed: boolean[];
	valid: boolean[];
	visited: boolean[];
}

export interface StepMachineState extends StepStates {
	currentStepIndex: number;
}

export type StepMachineAction =
	{ type: 'next'; isValid: boolean } | { type: 'previous' } | { type: 'go-to'; index: number };

/** Navigation request; the navigator validates the current step before reducing `next`. */
export type StepNavigationAction = { type: 'next' } | { type: 'previous' } | { type: 'go-to'; index: number };

/** Action triggers the step navigator dispatches around a step change. */
export type StepActionTrigger = Extract<FormActionTrigger, 'step_leave' | 'step_change' | 'step_enter'>;

export interface StepNavigatorOptions {
	reduce: StepMachineReducer;
	getState: () => StepMachineState;
	setState: (state: StepMachineState) => void;
	/** Validates one step by index; the renderer owns field validation and focus. */
	validateStep: (index: number) => Promise<boolean>;
	dispatchTrigger: (trigger: StepActionTrigger) => Promise<unknown>;
}

export type StepMachineReducer = (state: StepMachineState, action: StepMachineAction) => StepMachineState;

/**
 * Creates initial state with the first step visited and every step incomplete and invalid.
 */
export function createInitialStepStates(totalSteps: number): StepStates {
	return {
		completed: Array.from({ length: totalSteps }, () => false),
		valid: Array.from({ length: totalSteps }, () => false),
		visited: Array.from({ length: totalSteps }, (_, index) => index === 0),
	};
}

/**
 * Creates a pure reducer for navigation and state updates for a form's steps.
 */
export function createStepMachine(config: { steps: readonly unknown[] }): StepMachineReducer {
	const totalSteps = config.steps.length;

	return (state, action) => {
		if (action.type === 'next') {
			const index = state.currentStepIndex;
			if (index < 0 || index >= totalSteps) return state;

			const valid = state.valid.map((value, stepIndex) => (stepIndex === index ? action.isValid : value));
			if (!action.isValid || index === totalSteps - 1) {
				return { ...state, valid };
			}

			return {
				...state,
				currentStepIndex: index + 1,
				completed: state.completed.map((value, stepIndex) => (stepIndex === index ? true : value)),
				valid,
				visited: state.visited.map((value, stepIndex) => (stepIndex === index + 1 ? true : value)),
			};
		}

		if (action.type === 'previous') {
			if (state.currentStepIndex <= 0 || state.currentStepIndex >= totalSteps) return state;
			const currentStepIndex = state.currentStepIndex - 1;
			return {
				...state,
				currentStepIndex,
				visited: state.visited.map((value, stepIndex) => (stepIndex === currentStepIndex ? true : value)),
			};
		}

		if (action.index < 0 || action.index >= totalSteps) return state;
		return {
			...state,
			currentStepIndex: action.index,
			visited: state.visited.map((value, stepIndex) => (stepIndex === action.index ? true : value)),
		};
	};
}

/**
 * Creates the navigation sequence both renderers share around the step machine.
 *
 * @remarks
 * A request made while another is in flight is ignored, so a second Next cannot advance
 * using the validity of the step the first Next validated. When the step index changes,
 * `step_leave` runs before the new state is applied and `step_change` then `step_enter`
 * run after it; no step trigger runs when the index stays the same.
 */
export function createStepNavigator({
	reduce,
	getState,
	setState,
	validateStep,
	dispatchTrigger,
}: StepNavigatorOptions): (action: StepNavigationAction) => Promise<void> {
	let navigating = false;

	return async (action) => {
		if (navigating) return;
		navigating = true;
		try {
			const previous = getState();
			const next = reduce(
				previous,
				action.type === 'next'
					? { type: 'next', isValid: await validateStep(previous.currentStepIndex) }
					: action,
			);
			if (next.currentStepIndex === previous.currentStepIndex) {
				setState(next);
				return;
			}
			await dispatchTrigger('step_leave');
			setState(next);
			await dispatchTrigger('step_change');
			await dispatchTrigger('step_enter');
		} finally {
			navigating = false;
		}
	};
}
