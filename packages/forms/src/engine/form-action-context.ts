import type { FormFetch } from '../lib/form-fetch';
import type { BuilderActionBaseContext, FormStateError } from '@/types';

/**
 * Renderer form state in the engine's shape.
 *
 * @remarks
 * `errors` is flat, one entry per dotted field path, so `address.street` is read as
 * `errors['address.street']` in every renderer and a container and a row inside it
 * can both fail, and `touched` is flat the same way. A renderer that keeps them in another shape
 * converts them before building the context.
 *
 * `isValid` is the snapshot's: true when no error is recorded, in every renderer. It says
 * nothing about fields no validation has reached; `context.form.checkValidity()` answers for
 * the current values.
 */
export interface FormActionContextFormState {
	/** Whether no error is recorded for a path that takes part, as `snapshot.isValid` says. */
	isValid: boolean;
	/** Errors by dotted field path, as `validateFormValues` returns them. */
	errors: Readonly<Record<string, FormStateError>>;
	/** Touched fields by dotted path, `true` at each field the user has touched. */
	touched: Readonly<Partial<Record<string, boolean>>>;
	submitCount: number;
}

interface StepTiming {
	mountedAt: number;
	currentStep: number;
	stepStartTime: number;
}

interface BuildFormActionContextOptions<TForm extends BuilderActionBaseContext['form']> {
	config: { id?: string; steps: readonly unknown[] };
	values: Record<string, unknown>;
	formState: FormActionContextFormState;
	currentStep: number;
	mountedAt: number;
	form: TForm;
	/** The engine's `fetch`, which the context hands to actions. */
	fetch: FormFetch;
}

const stepTimings = new WeakMap<object, StepTiming>();

const countTouched = (touched: Readonly<Partial<Record<string, boolean>>>): number =>
	Object.values(touched).filter((isTouched) => isTouched === true).length;

function getStepStartTime(form: object, currentStep: number, mountedAt: number, now: number): number {
	const timing = stepTimings.get(form);
	if (!timing || timing.mountedAt !== mountedAt) {
		stepTimings.set(form, { mountedAt, currentStep, stepStartTime: mountedAt });
		return mountedAt;
	}

	if (timing.currentStep !== currentStep) {
		timing.currentStep = currentStep;
		timing.stepStartTime = now;
	}

	return timing.stepStartTime;
}

/**
 * Builds the framework-neutral action context used by form action dispatch.
 *
 * @remarks
 * Step start times are kept per form instance and reset when its active step changes.
 * `userInteractions` counts touched fields plus submissions.
 */
export function buildFormActionContext<TForm extends BuilderActionBaseContext['form']>({
	config,
	values,
	formState,
	currentStep,
	mountedAt,
	form,
	fetch,
}: BuildFormActionContextOptions<TForm>): BuilderActionBaseContext {
	const now = Date.now();

	return {
		formId: config.id || 'unnamed-form',
		formData: values,
		currentStep,
		totalSteps: config.steps.length,
		isValid: formState.isValid,
		errors: formState.errors,
		metadata: {
			stepStartTime: getStepStartTime(form, currentStep, mountedAt, now),
			totalFormTime: now - mountedAt,
			userInteractions: countTouched(formState.touched) + formState.submitCount,
		},
		form,
		fetch,
	};
}

interface ActionScopes<TAction> {
	actions?: readonly TAction[];
	steps: readonly { actions?: readonly TAction[] }[];
}

/**
 * Lists the actions a trigger dispatches while the step at `stepIndex` is active: the
 * form's `actions`, then that step's.
 *
 * @remarks
 * The step navigator dispatches `step_leave` while the step being left is active and
 * `step_change` and `step_enter` once the entered step is, so a step's actions see the
 * step triggers of navigation into and out of that step, plus every other trigger fired
 * while it is current.
 */
export function collectStepActions<TAction>(config: ActionScopes<TAction>, stepIndex: number): TAction[] {
	return [...(config.actions ?? []), ...(config.steps[stepIndex]?.actions ?? [])];
}

/** Whether the form or any of its steps configures an action. */
export function hasConfiguredActions(config: ActionScopes<unknown>): boolean {
	return Boolean(config.actions?.length) || config.steps.some((step) => Boolean(step.actions?.length));
}
