import type { BuilderActionBaseContext } from '@/types';
import type { FormValidationErrors } from './value-validation';

/**
 * Renderer form state in the engine's shape.
 *
 * @remarks
 * `errors` and `touched` are nested like the form values, so `address.street`
 * is read as `errors.address.street` in every renderer. A renderer that keys
 * them by flat field name expands them before building the context.
 */
export interface FormActionContextFormState {
	isValid: boolean;
	/** Nested errors, as `validateFormValues` returns them. */
	errors: FormValidationErrors;
	/** Nested touched state with `true` at each touched field. */
	touched: Record<string, unknown>;
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
}

const stepTimings = new WeakMap<object, StepTiming>();

function countTouched(touched: unknown): number {
	if (touched === true) return 1;
	if (typeof touched !== 'object' || touched === null) return 0;
	return Object.values(touched).reduce<number>((count, child) => count + countTouched(child), 0);
}

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
