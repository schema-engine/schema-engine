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
