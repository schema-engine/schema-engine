import { collectStepFieldPaths, type ValidationStep } from './value-validation';
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

/** Wizard navigation returned by {@link createStepNavigator}. */
export interface StepNavigator {
	navigate: (action: StepNavigationAction) => Promise<void>;
	/**
	 * Abandons the navigation in flight, if any.
	 *
	 * @remarks
	 * Call it with every step state reset. The abandoned navigation writes no state and
	 * dispatches no further trigger, and the next request is accepted without waiting for it.
	 */
	cancel: () => void;
}

/**
 * Creates the navigation sequence both renderers share around the step machine.
 *
 * @remarks
 * A request made while another is in flight is ignored, so a second Next cannot advance
 * using the validity of the step the first Next validated. When the step index changes,
 * `step_leave` runs before the new state is applied and `step_change` then `step_enter`
 * run after it; no step trigger runs when the index stays the same. Each navigation holds
 * a token that `cancel` revokes, and it checks the token after every await, so a reset
 * made while it validates or dispatches is not overwritten.
 */
export function createStepNavigator({
	reduce,
	getState,
	setState,
	validateStep,
	dispatchTrigger,
}: StepNavigatorOptions): StepNavigator {
	let active: object | undefined;

	const navigate = async (action: StepNavigationAction): Promise<void> => {
		if (active) return;
		const token = {};
		active = token;
		const cancelled = () => active !== token;
		try {
			const previous = getState();
			const machineAction: StepMachineAction =
				action.type === 'next'
					? { type: 'next', isValid: await validateStep(previous.currentStepIndex) }
					: action;
			if (cancelled()) return;
			const next = reduce(previous, machineAction);
			if (next.currentStepIndex === previous.currentStepIndex) {
				setState(next);
				return;
			}
			await dispatchTrigger('step_leave');
			if (cancelled()) return;
			setState(next);
			await dispatchTrigger('step_change');
			if (cancelled()) return;
			await dispatchTrigger('step_enter');
		} finally {
			if (active === token) active = undefined;
		}
	};

	return {
		navigate,
		cancel: () => {
			active = undefined;
		},
	};
}

/**
 * How freely a wizard moves forward.
 *
 * @remarks
 * `'linear'` reaches only steps already visited and validates every step on the way; `'free'` reaches any
 * active step without validating. Going back is always allowed and `next()` validates in both.
 */
export type StepNavigationMode = 'linear' | 'free';

/**
 * One step of a form as a renderer reads it.
 *
 * @remarks
 * Only `visited` and `complete` are stored, by step id. `skipped` is derived from the values (the step's
 * constraints hide it) and `invalid` from the errors recorded at its fields, so neither can go stale.
 */
export interface FormStepState {
	readonly id: string;
	/** Its constraints hide it: it is passed over and its fields take no part. */
	readonly skipped: boolean;
	readonly visited: boolean;
	/** `next()` validated it and moved on. */
	readonly complete: boolean;
	/** An error is recorded at one of its fields. */
	readonly invalid: boolean;
}

/** What the runtime stores of the steps: where the user is, and which steps were visited and completed, by id. */
export interface StepProgress {
	readonly current: string;
	readonly visited: readonly string[];
	readonly complete: readonly string[];
}

/** Progress at the start: the first step is current and visited. */
export const startProgress = (first: string): StepProgress => ({ current: first, visited: [first], complete: [] });

const including = (ids: readonly string[], added: readonly string[]): readonly string[] =>
	added.every((id) => ids.includes(id)) ? ids : [...ids, ...added.filter((id) => !ids.includes(id))];

/** Progress after moving to `to`, which becomes visited, with `completed` marked complete. */
export function moveProgress(progress: StepProgress, to: string, completed: readonly string[] = []): StepProgress {
	const visited = including(progress.visited, [to]);
	const complete = including(progress.complete, completed);
	return progress.current === to && visited === progress.visited && complete === progress.complete
		? progress
		: { current: to, visited, complete };
}

/** The steps as renderers read them, from the stored progress and what the values and errors say. */
export function deriveStepStates(
	steps: readonly { readonly id: string }[],
	progress: StepProgress,
	derived: { readonly skipped: readonly string[]; readonly invalid: readonly string[] },
): FormStepState[] {
	return steps.map(({ id }) => ({
		id,
		skipped: derived.skipped.includes(id),
		visited: progress.visited.includes(id),
		complete: progress.complete.includes(id),
		invalid: derived.invalid.includes(id),
	}));
}

/** The ids of the steps that are not skipped, in order. */
export const activeStepIds = (states: readonly FormStepState[]): string[] =>
	states.filter(({ skipped }) => !skipped).map(({ id }) => id);

/** The nearest active step after `id`, which may itself be skipped, or `undefined` on the last one. */
export function stepAfter(states: readonly FormStepState[], id: string): string | undefined {
	const at = states.findIndex((state) => state.id === id);
	return states.slice(at + 1).find(({ skipped }) => !skipped)?.id;
}

/** The nearest active step before `id`, which may itself be skipped, or `undefined` on the first one. */
export function stepBefore(states: readonly FormStepState[], id: string): string | undefined {
	const at = states.findIndex((state) => state.id === id);
	return states.slice(0, Math.max(at, 0)).findLast(({ skipped }) => !skipped)?.id;
}

/**
 * The ids of the steps that have an error recorded at one of their fields.
 *
 * @remarks Fields are read as `collectStepFieldPaths` expands them over the live rows.
 */
export function stepsWithErrors(
	steps: readonly (ValidationStep & { readonly id: string })[],
	values: Record<string, unknown>,
	errors: Readonly<Record<string, unknown>>,
): string[] {
	return steps
		.filter((step) => collectStepFieldPaths(step, values).some((path) => Object.hasOwn(errors, path)))
		.map(({ id }) => id);
}
