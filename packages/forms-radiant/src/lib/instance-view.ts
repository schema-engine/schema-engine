import type { FormStepState, NormalizedFormConfig } from '@schema-engine/forms';
import {
	createViewNavigation,
	projectViewSteps,
	type ViewNavigation,
	type ViewStep,
} from '@schema-engine/forms/recipes';
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
 * Derives the steps that are not skipped from form metadata and the live instance state.
 *
 * @remarks
 * Recipe blocks read this instead of a prebuilt view model so SSR consumers can
 * resolve everything from serializable props plus the instance context, without
 * a separate view context whose provider publishes after children serialize.
 */
export function deriveFormSteps(
	config: FormMeta,
	instance: Pick<FormInstanceContextValue, 'current' | 'steps'>,
): ViewStep[] {
	return projectViewSteps(config.steps, instance.steps, instance.current);
}

/** The navigation a block reads: what can be reached from the current step, and the commands that move there. */
export function deriveNavigation(
	config: FormMeta,
	instance: Pick<FormInstanceContextValue, 'current' | 'steps' | 'next' | 'back' | 'goTo'>,
): ViewNavigation {
	return createViewNavigation(instance.steps, instance.current, instance);
}

/** The steps before any runtime has them: none skipped, the first visited. */
export const initialSteps = (config: FormMeta): FormStepState[] =>
	config.steps.map(({ id }, index) => ({
		id,
		skipped: false,
		visited: index === 0,
		complete: false,
		invalid: false,
		reachable: false,
	}));

/**
 * Initial instance state derived from form metadata.
 *
 * @remarks
 * SSR consumers construct before any context provider publishes, so block hosts
 * fall back to this (the first step, untouched step states, inert navigation) and the
 * live `formInstanceContext` takes over once hydration resolves.
 */
export function deriveInitialInstance(config: FormMeta): FormInstanceContextValue {
	return {
		current: config.steps[0]?.id ?? '',
		steps: initialSteps(config),
		navigating: false,
		isWizard: false,
		meta: config,
		next: async () => 'refused',
		back: async () => 'refused',
		goTo: async () => 'refused',
		submission: { status: 'idle', failures: [], submitCount: 0 },
		runtime: undefined,
		formatIssue: undefined,
	};
}
