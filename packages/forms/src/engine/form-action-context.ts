import type { BuilderActionBaseContext } from '@/types';

export interface FormActionContextFormState {
	isValid: boolean;
	errors: Record<string, unknown>;
	submitCount?: number;
	touched?: Record<string, unknown>;
	touchedFields?: Record<string, unknown>;
	isSubmitted?: boolean;
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
 * @remarks Step start times are kept per form instance and reset when its active step changes.
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
	const touchedFields = formState.touchedFields ?? formState.touched ?? {};
	const submittedCount = formState.submitCount ?? Number(formState.isSubmitted ?? false);

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
			userInteractions: Object.keys(touchedFields).length + submittedCount,
		},
		form,
	};
}
