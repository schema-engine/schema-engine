import { ActionDispatcher } from '@schema-engine/actions';
import type { ActionDispatchInput } from '@schema-engine/actions';
import type { FormActionTrigger } from '@/actions';
import { buildFormActionContext, collectStepActions } from '@/engine/form-action-context';
import {
	activeStepIds,
	deriveStepStates,
	moveProgress,
	startProgress,
	stepAfter,
	stepBefore,
	stepsWithErrors,
	type FormStepState,
	type StepProgress,
} from '@/engine/step-machine';
import {
	runSubmissionLifecycle,
	type FormActionConfig,
	type SubmissionActionResult,
} from '@/runtime/submission-lifecycle';
import { collectStepFieldPaths, resolveParticipation } from '@/engine/value-validation';
import { collectInitialValues, flattenStepElements } from '@/lib/field-scope';
import { logger } from '@/lib/logger';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import type { FormStateSnapshot, FormSubmissionIssue, FormSubmitResult } from '@/state-container/types';
import type { BuilderActionBaseContext } from '@/types';
import type {
	CreateFormRuntimeOptions,
	FormRuntime,
	FormRuntimeSnapshot,
	FormSubmissionState,
	FormValues,
	NavigationOutcome,
	SubmitOutcome,
} from './types';

const NO_FAILURES: readonly FormSubmissionIssue[] = Object.freeze([]);
const IDLE: FormSubmissionState = Object.freeze({ status: 'idle', failures: NO_FAILURES, submitCount: 0 });

/** A submission failure, in the shape of an issue so the form's one formatter words it. */
function submissionIssue(
	type: string,
	{ actionId, message }: { actionId?: string; message?: string } = {},
): FormSubmissionIssue {
	return {
		type,
		source: 'submission',
		...(actionId === undefined ? {} : { params: { actionId } }),
		...(message ? { message } : {}),
	};
}

const errorMessage = (error: unknown): string | undefined => (error instanceof Error ? error.message : undefined);

type Verdict = 'valid' | 'invalid' | 'overtaken';

/** A command in flight, which a reset or an unmount revokes by replacing it. */
interface Operation {
	readonly kind: 'navigation' | 'submission';
}

const sameSteps = (a: readonly FormStepState[], b: readonly FormStepState[]): boolean =>
	a.length === b.length &&
	a.every(
		(step, index) =>
			step.id === b[index]?.id &&
			step.skipped === b[index].skipped &&
			step.visited === b[index].visited &&
			step.complete === b[index].complete &&
			step.invalid === b[index].invalid,
	);

/**
 * Creates the lifecycle of one rendered form: its container, its submission, its wizard steps and every action dispatch.
 *
 * @remarks
 * One runtime serves every renderer, so none keeps a copy of the lifecycle. The container owns values, field
 * state, validation, participation (a skipped step's fields take no part) and `reset()`; the runtime owns what
 * is around it, and the renderer owns the element, focus, sync and native submit.
 *
 * `container.reset()` is the only reset. The snapshot's `generation` goes up with it, and the runtime then
 * revokes the command in flight, returns the submission to idle and the steps to the first, firing no step
 * trigger, so whichever caller resets resets everything.
 *
 * One lock covers navigation and submission: a command made while another runs ends `'busy'`. A revoked
 * command checks after every await and ends `'cancelled'`, writing nothing. The submission lifecycle is not
 * cut short by a reset: once validation passed it runs to its end, so a `reset` action on
 * `form_submit_success` does not keep `form_submit_complete` from running. An action already running for
 * `form_mount` or `form_change` is not a command and runs to its end. Step actions cannot block a move:
 * the validation of the step is the guard, and a failing step action is reported through `onActionResults`.
 */
export function createFormRuntime<TAction extends FormActionConfig = FormActionConfig>(
	options: CreateFormRuntimeOptions<TAction>,
): FormRuntime {
	const { engine, config, host, onSubmit, onChange, onAction, onActionResults } = options;
	const container = createFormStateContainer({
		config,
		registry: engine.getValidationRegistry(),
		defaults: collectInitialValues(flattenStepElements(config.steps), options.defaults ?? {}),
		snapshot: options.snapshot,
	});
	const dispatcher = new ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>(engine);
	const mountedAt = Date.now();
	const mode = config.navigation ?? 'linear';
	const hasStepConstraints = config.steps.some((step) => Boolean(step.constraints?.length));
	const firstStep = config.steps[0]?.id ?? '';

	let progress: StepProgress = startProgress(firstStep);
	let submission: FormSubmissionState = IDLE;
	let navigating = false;
	let operation: Operation | undefined;
	let generation = container.getSnapshot().generation;
	let version = 0;
	let previousValues = container.getServerSnapshot().values;
	let mountedOnce = false;
	const listeners = new Set<() => void>();

	const publish = (): void => {
		version += 1;
		for (const listener of listeners) listener();
	};

	interface Derived {
		readonly values: FormStateSnapshot['values'];
		readonly errors: FormStateSnapshot['errors'];
		readonly skipped: readonly string[];
		readonly invalid: readonly string[];
	}
	let derivedFor: Derived | undefined;
	function derive(snapshot: FormStateSnapshot): Derived {
		if (derivedFor?.values === snapshot.values && derivedFor.errors === snapshot.errors) return derivedFor;
		const { values, errors } = snapshot;
		derivedFor = {
			values,
			errors,
			skipped: hasStepConstraints ? resolveParticipation(config.steps, { ...values }).skippedSteps : [],
			invalid: stepsWithErrors(config.steps, { ...values }, errors),
		};
		return derivedFor;
	}

	const statesFor = (derived: Derived): FormStepState[] => deriveStepStates(config.steps, progress, derived);
	const currentStates = (): FormStepState[] => statesFor(derive(container.getSnapshot()));

	let cached:
		{ readonly version: number; readonly derived: Derived; readonly snapshot: FormRuntimeSnapshot } | undefined;
	function getSnapshot(): FormRuntimeSnapshot {
		const derived = derive(container.getSnapshot());
		if (cached?.version === version && cached.derived === derived) return cached.snapshot;
		const list = statesFor(derived);
		const before = cached?.snapshot;
		const snapshot: FormRuntimeSnapshot =
			before &&
			before.submission === submission &&
			before.steps.current === progress.current &&
			before.steps.navigating === navigating &&
			sameSteps(before.steps.list, list)
				? before
				: {
						submission,
						steps: {
							current: progress.current,
							navigating,
							list: before && sameSteps(before.steps.list, list) ? before.steps.list : list,
						},
					};
		cached = { version, derived, snapshot };
		return snapshot;
	}

	const serverSnapshot: FormRuntimeSnapshot = Object.freeze({
		submission: IDLE,
		steps: Object.freeze({
			current: firstStep,
			navigating: false,
			list: deriveStepStates(config.steps, startProgress(firstStep), {
				skipped: hasStepConstraints
					? resolveParticipation(config.steps, { ...container.getServerSnapshot().values }).skippedSteps
					: [],
				invalid: [],
			}),
		}),
	});

	const live = (op: Operation): boolean => operation === op;

	function begin(kind: Operation['kind']): Operation | undefined {
		if (operation) return undefined;
		operation = { kind };
		if (kind === 'navigation') navigating = true;
		publish();
		return operation;
	}

	function end(op: Operation): void {
		if (operation === op) {
			operation = undefined;
			navigating = false;
			publish();
		}
		reconcile();
	}

	function revoke(): void {
		operation = undefined;
		navigating = false;
		if (submission.status === 'pending') submission = { ...submission, status: 'idle', failures: NO_FAILURES };
	}

	function setSubmission(next: FormSubmissionState): void {
		submission = next;
		publish();
	}

	const setProgress = (next: StepProgress): void => {
		if (next === progress) return;
		progress = next;
		publish();
	};

	const stepById = (id: string) => config.steps.find((step) => step.id === id);

	function stepPaths(id: string): string[] {
		const step = stepById(id);
		return step ? collectStepFieldPaths(step, { ...container.getSnapshot().values }) : [];
	}

	function errorPaths(id: string): string[] {
		const { errors } = container.getSnapshot();
		return stepPaths(id).filter((path) => Object.hasOwn(errors, path));
	}

	function buildContext(values?: FormValues): BuilderActionBaseContext {
		const snapshot = container.getSnapshot();
		const active = activeStepIds(currentStates());
		return buildFormActionContext({
			config,
			values: { ...(values ?? snapshot.values) },
			formState: {
				isValid: snapshot.isValid,
				errors: snapshot.errors,
				touched: snapshot.touched,
				submitCount: submission.submitCount,
			},
			step: {
				id: progress.current,
				position: Math.max(active.indexOf(progress.current), 0),
				total: active.length,
			},
			mountedAt,
			form,
			fetch: engine.fetch,
		});
	}

	const form: BuilderActionBaseContext['form'] = {
		reset: () => container.reset(),
		setValue: (name, value) => container.setValue(name, value),
		getValue: (name) => container.getValue(name),
		validate: () => {
			host.sync?.();
			return container.validate();
		},
		checkValidity: () => {
			host.sync?.();
			return container.checkValidity();
		},
	};

	async function dispatchActions(
		input: ActionDispatchInput<TAction, BuilderActionBaseContext, FormActionTrigger>,
		reportSubmit = true,
	): Promise<SubmissionActionResult[]> {
		const results = await dispatcher.dispatch(input);
		if (results.length && (reportSubmit || input.trigger !== 'form_submit')) {
			try {
				await onActionResults?.(results, input.trigger);
			} catch (error) {
				logger.error('Action results callback failed:', error);
			}
		}
		return results;
	}

	/** Dispatches a trigger for the current step's actions, which never rejects: a failing trigger is logged and reported. */
	async function dispatchTrigger(trigger: FormActionTrigger): Promise<void> {
		try {
			const actions = collectStepActions(config, progress.current);
			if (!dispatcher.hasMatching(actions, trigger)) return;
			await dispatchActions({ actions, trigger, context: buildContext() });
		} catch (error) {
			logger.error(`Form action trigger ${trigger} failed`, error);
		}
	}

	/** Moves to `to`, marking `completed` steps complete: `step_leave`, then the new state, then `step_change` and `step_enter`. */
	async function move(op: Operation, to: string, completed: readonly string[] = []): Promise<boolean> {
		if (progress.current === to) {
			setProgress(moveProgress(progress, to, completed));
			return live(op);
		}
		await dispatchTrigger('step_leave');
		if (!live(op)) return false;
		setProgress(moveProgress(progress, to, completed));
		await dispatchTrigger('step_change');
		if (!live(op)) return false;
		await dispatchTrigger('step_enter');
		return live(op);
	}

	/**
	 * Moves back to the nearest active step before the current one when the current one has become skipped.
	 *
	 * @remarks It never moves forward: that would skip a validation. A command in flight runs this when it ends.
	 */
	function reconcile(): void {
		if (operation) return;
		const states = currentStates();
		const current = states.find(({ id }) => id === progress.current);
		if (!current?.skipped) return;
		const target = stepBefore(states, current.id);
		if (target === undefined) return;
		const op = begin('navigation');
		if (!op) return;
		move(op, target)
			.catch((error: unknown) => logger.error('Moving off a skipped step failed', error))
			.finally(() => end(op));
	}

	async function validateStep(id: string): Promise<Verdict> {
		const paths = stepPaths(id);
		if (paths.length === 0) return 'valid';
		try {
			if (await container.validate(paths)) return 'valid';
		} catch (error) {
			logger.error('Step validation could not run', error);
			return 'invalid';
		}
		return errorPaths(id).length > 0 ? 'invalid' : 'overtaken';
	}

	/** Validates the current step and moves on to the next active one; the caller has checked there is one. */
	async function advance(op: Operation): Promise<Exclude<NavigationOutcome, 'refused' | 'busy'>> {
		const from = progress.current;
		host.sync?.();
		const verdict = await validateStep(from);
		if (!live(op)) return 'cancelled';
		if (verdict === 'invalid') {
			host.focus(errorPaths(from));
			return 'invalid';
		}
		if (verdict === 'overtaken') return 'overtaken';
		const target = stepAfter(currentStates(), from);
		if (target === undefined) {
			setProgress(moveProgress(progress, from, [from]));
			return 'overtaken';
		}
		return (await move(op, target, [from])) ? 'moved' : 'cancelled';
	}

	/**
	 * Moves to the first active step that has an error and focuses its fields, or stays when none has: an error about the form itself belongs to no step.
	 *
	 * @remarks It serves a submission that was invalid and a server error that arrived after `onSubmit`, so an error is never on a step nobody can see.
	 */
	async function landOnErrors(op: Operation): Promise<boolean> {
		const first = activeStepIds(currentStates()).find((id) => errorPaths(id).length > 0);
		if (first === undefined) return live(op);
		if (first !== progress.current && !(await move(op, first))) return false;
		host.focus(errorPaths(first));
		return live(op);
	}

	async function runNavigation(task: (op: Operation) => Promise<NavigationOutcome>): Promise<NavigationOutcome> {
		const op = begin('navigation');
		if (!op) return 'busy';
		try {
			return await task(op);
		} finally {
			end(op);
		}
	}

	const next = (): Promise<NavigationOutcome> =>
		runNavigation(async (op) =>
			stepAfter(currentStates(), progress.current) === undefined ? 'refused' : advance(op),
		);

	const back = (): Promise<NavigationOutcome> =>
		runNavigation(async (op) => {
			const target = stepBefore(currentStates(), progress.current);
			if (target === undefined) return 'refused';
			return (await move(op, target)) ? 'moved' : 'cancelled';
		});

	const goTo = (id: string): Promise<NavigationOutcome> =>
		runNavigation(async (op) => {
			const states = currentStates();
			const target = states.find((state) => state.id === id);
			if (!target || target.skipped || id === progress.current) return 'refused';
			const order = activeStepIds(states);
			const at = order.indexOf(progress.current);
			const to = order.indexOf(id);
			if (at !== -1 && to < at) return (await move(op, id)) ? 'moved' : 'cancelled';
			if (mode === 'linear' && !target.visited) return 'refused';
			if (mode === 'free') return (await move(op, id)) ? 'moved' : 'cancelled';
			host.sync?.();
			const passed: string[] = [];
			for (const step of [progress.current, ...order.slice(at + 1, to)]) {
				const verdict = await validateStep(step);
				if (!live(op)) return 'cancelled';
				if (verdict === 'overtaken') return 'overtaken';
				if (verdict === 'invalid') {
					if (!(await move(op, step, passed))) return 'cancelled';
					host.focus(errorPaths(step));
					return 'invalid';
				}
				passed.push(step);
			}
			return (await move(op, id, passed)) ? 'moved' : 'cancelled';
		});

	async function submitLastStep(op: Operation): Promise<SubmitOutcome> {
		host.sync?.();
		setSubmission({ status: 'pending', failures: NO_FAILURES, submitCount: submission.submitCount });
		let result: FormSubmitResult;
		try {
			result = await container.submit();
		} catch (error) {
			if (!live(op)) return 'cancelled';
			logger.error('Form validation failed:', error);
			setSubmission({
				status: 'error',
				failures: [submissionIssue('validationFailed', { message: errorMessage(error) })],
				submitCount: submission.submitCount,
			});
			return 'failed';
		}
		if (!live(op)) return 'cancelled';
		if (result.outcome === 'overtaken') {
			setSubmission({ ...submission, status: 'idle' });
			return 'overtaken';
		}
		if (result.outcome === 'invalid') {
			setSubmission({ status: 'idle', failures: NO_FAILURES, submitCount: submission.submitCount + 1 });
			return (await landOnErrors(op)) ? 'invalid' : 'cancelled';
		}

		const { values, setServerErrors } = result;
		const { succeeded, results, failure } = await runSubmissionLifecycle<TAction>(
			(input) => dispatchActions(input, false),
			{
				actions: collectStepActions(config, progress.current),
				context: () => buildContext(values),
				hasMatching: (actions, trigger) => dispatcher.hasMatching(actions, trigger),
				onAction: (action, data) => onAction?.(action, data),
				onSubmit: onSubmit ? () => onSubmit(values, { setServerErrors, fetch: engine.fetch }) : undefined,
			},
		);
		if (!live(op)) return 'cancelled';
		try {
			if (results.length) await onActionResults?.(results, 'form_submit');
		} catch (error) {
			logger.error('Action results callback failed:', error);
		}
		if (!live(op)) return 'cancelled';
		if (succeeded) host.submitNatively?.();

		const count = submission.submitCount + 1;
		if (succeeded) {
			if (failure) logger.error('Form submission completed with a failing trigger:', failure.error);
			setSubmission({ status: 'success', failures: NO_FAILURES, submitCount: count });
		} else if (failure) {
			logger.error('Form submission failed:', failure.error);
			setSubmission({
				status: 'error',
				failures: [
					submissionIssue(failure.phase === 'callback' ? 'callbackFailed' : 'triggerFailed', {
						message: errorMessage(failure.error),
					}),
				],
				submitCount: count,
			});
		} else {
			setSubmission({
				status: 'error',
				failures: results
					.filter((outcome) => !outcome.success && outcome.shouldContinue === false)
					.map((outcome) =>
						submissionIssue('actionFailed', { actionId: outcome.actionId, message: outcome.error }),
					),
				submitCount: count,
			});
		}
		if (!(await landOnErrors(op))) return 'cancelled';
		return succeeded ? 'submitted' : 'failed';
	}

	async function submit(): Promise<SubmitOutcome> {
		const before = stepAfter(currentStates(), progress.current) !== undefined;
		const op = begin(before ? 'navigation' : 'submission');
		if (!op) return 'busy';
		try {
			return before ? await advance(op) : await submitLastStep(op);
		} finally {
			end(op);
		}
	}

	function onContainerChange(): void {
		const { generation: current } = container.getSnapshot();
		if (current !== generation) {
			generation = current;
			revoke();
			submission = IDLE;
			progress = startProgress(firstStep);
		}
		publish();
		reconcile();
	}
	container.subscribe(onContainerChange);

	function watchChanges(): () => void {
		const report = (): void => {
			const { values } = container.getSnapshot();
			if (Object.is(previousValues, values)) return;
			previousValues = values;
			void dispatchTrigger('form_change');
			onChange?.(values);
		};
		report();
		return container.subscribe(report);
	}

	return {
		container,
		mount() {
			const stopWatching = watchChanges();
			if (!mountedOnce) {
				mountedOnce = true;
				void dispatchTrigger('form_mount');
			}
			return () => {
				stopWatching();
				revoke();
				publish();
			};
		},
		getSnapshot,
		getServerSnapshot: () => serverSnapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		next,
		back,
		goTo,
		submit,
		clearSubmission() {
			if (submission.status === 'idle' && submission.failures.length === 0) return;
			setSubmission({ ...submission, status: 'idle', failures: NO_FAILURES });
		},
	};
}
