import { collectStepFieldPaths, type ValidationStep } from './value-validation';

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
