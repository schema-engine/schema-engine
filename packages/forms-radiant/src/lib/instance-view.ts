import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { ViewStep } from '@schema-engine/forms/recipes';
import type { FormInstanceContextValue } from '@/contexts/form-instance-context';

/**
 * Derives the rendered step list from a frozen config and the live instance state.
 *
 * @remarks
 * Recipe blocks read this instead of a prebuilt view model so SSR consumers can
 * resolve everything from serializable props plus the instance context, without
 * a separate view context whose provider publishes after children serialize.
 */
export function deriveFormSteps(
	config: NormalizedFormConfig,
	instance: Pick<FormInstanceContextValue, 'currentStep' | 'stepStates'>,
): ViewStep[] {
	return config.steps.map((step, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: config.steps.length,
		isActive: index === instance.currentStep,
		isCompleted: instance.stepStates.completed[index] ?? false,
		isValid: instance.stepStates.valid[index] ?? false,
		isVisited: instance.stepStates.visited[index] ?? false,
	}));
}

/** Form-level metadata block hosts render in chrome. */
export function deriveFormMeta(
	config: NormalizedFormConfig,
	instance: Pick<FormInstanceContextValue, 'isSubmitting'>,
): { id: string; title?: string; description?: string; isSubmitting: boolean } {
	return {
		id: config.id,
		title: config.title,
		description: config.description,
		isSubmitting: instance.isSubmitting,
	};
}

/**
 * Initial instance state derived from a frozen config.
 *
 * @remarks
 * SSR consumers construct before any context provider publishes, so block hosts
 * fall back to this (step 0, untouched step states, inert navigation) and the
 * live `formInstanceContext` takes over once hydration resolves.
 */
export function deriveInitialInstance(config: NormalizedFormConfig): FormInstanceContextValue {
	const totalSteps = config.steps.length;
	return {
		currentStep: 0,
		totalSteps,
		isWizard: false,
		stepStates: {
			completed: Array.from({ length: totalSteps }, () => false),
			valid: Array.from({ length: totalSteps }, () => false),
			visited: Array.from({ length: totalSteps }, (item, index) => index === 0),
		},
		goToStep: () => {},
		goToNextStep: () => {},
		goToPreviousStep: () => {},
		markStepCompleted: () => {},
		markStepVisited: () => {},
		isSubmitting: false,
	};
}
