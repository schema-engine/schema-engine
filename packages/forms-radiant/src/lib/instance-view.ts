import type { NormalizedFormConfig } from '@schema-engine/forms';
import { createInitialStepStates } from '@schema-engine/forms/engine';
import { buildViewSteps, type ViewStep } from '@schema-engine/forms/recipes';
import type { FormInstanceContextValue } from '@/contexts/form-instance-context';

/** Serializable form chrome without field definitions, rules, or defaults. */
export interface FormMeta {
	id: string;
	title?: string;
	description?: string;
	steps: { id: string; title?: string; description?: string }[];
}

export function createFormMeta(config: NormalizedFormConfig): FormMeta {
	return {
		id: config.id,
		title: config.title,
		description: config.description,
		steps: config.steps.map(({ id, title, description }) => ({ id, title, description })),
	};
}

/**
 * Derives the rendered step list from form metadata and the live instance state.
 *
 * @remarks
 * Recipe blocks read this instead of a prebuilt view model so SSR consumers can
 * resolve everything from serializable props plus the instance context, without
 * a separate view context whose provider publishes after children serialize.
 */
export function deriveFormSteps(
	config: FormMeta,
	instance: Pick<FormInstanceContextValue, 'currentStep' | 'stepStates'>,
): ViewStep[] {
	return buildViewSteps(config.steps, instance.currentStep, instance.stepStates);
}

/**
 * Initial instance state derived from form metadata.
 *
 * @remarks
 * SSR consumers construct before any context provider publishes, so block hosts
 * fall back to this (step 0, untouched step states, inert navigation) and the
 * live `formInstanceContext` takes over once hydration resolves.
 */
export function deriveInitialInstance(config: FormMeta): FormInstanceContextValue {
	const totalSteps = config.steps.length;
	return {
		currentStep: 0,
		totalSteps,
		isWizard: false,
		stepStates: createInitialStepStates(totalSteps),
		meta: config,
		goToStep: async () => {},
		goToNextStep: async () => {},
		goToPreviousStep: async () => {},
		markStepCompleted: () => {},
		markStepVisited: () => {},
		isSubmitting: false,
		submitCount: 0,
		container: undefined,
		formatIssue: undefined,
	};
}
