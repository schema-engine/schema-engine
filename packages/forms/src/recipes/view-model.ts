import * as z from 'zod/mini';
import type { FormConfigView } from '@/lib/normalized-form-config';
import {
	stepAfter,
	stepBefore,
	type FormStepState,
	type StepNavigationMode,
	type StepStates,
} from '@/engine/step-machine';
import type { AnyRecipeRegistration } from '@/types/registration';
import { readSlotConfig, type RecipeViewModel } from '@schema-engine/layout';
import type { RecipeKind, RecipeSlot } from './types';

/**
 * The commands a stepper or an actions block calls, and whether each is available.
 *
 * @remarks `goToStep` takes a step id, which stays right when steps are skipped; indexes do not.
 */
export interface ViewNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	/** Whether `goToStep(stepId)` can move there: an active step other than the current one, going back or, going forward, as the form's `navigation` allows. */
	canGoToStep: (stepId: string) => boolean;
	goToStep: (stepId: string) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

/**
 * One step as a recipe block reads it.
 *
 * @remarks
 * `index` is the position among the steps that are not skipped, and `total` how many there are, so
 * progress reads "step 2 of 3" however many are skipped; a skipped step has `index` -1.
 */
export interface ViewStep {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
	isActive: boolean;
	isCompleted: boolean;
	isInvalid: boolean;
	isVisited: boolean;
	isSkipped: boolean;
}

export interface ViewModel extends RecipeViewModel<RecipeKind> {
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting: boolean;
	};
	/** The steps that are not skipped, in order: what progress and a stepper count. */
	steps: ViewStep[];
	/** Every step in order, skipped ones included, for a recipe that shows them disabled. */
	allSteps: ViewStep[];
	activeStep: ViewStep;
	/** The position of the current step among `steps`. */
	currentStepIndex: number;
	navigation: ViewNavigation;
}

/**
 * Reads one slot's complete config from a normalized view; see the layout `readSlotConfig`, which this
 * types by the forms slot names.
 */
export function getSlotConfig<TSchema extends z.ZodMiniType>(
	viewConfig: Record<string, unknown>,
	slot: RecipeSlot,
	schema: TSchema,
): z.output<TSchema> {
	return readSlotConfig(viewConfig, slot, schema);
}

/**
 * Resolves the recipe a normalized form's `view` selects, or `undefined` when the form has no view.
 *
 * @remarks
 * Throws when `view.$type` is not registered on the engine, so a config normalized elsewhere fails
 * loudly instead of rendering without chrome.
 */
export function getViewRecipe(
	engine: { getRecipe(id: string): AnyRecipeRegistration | undefined },
	config: { id: string; view?: { $type: string } },
): AnyRecipeRegistration | undefined {
	if (!config.view) return undefined;
	const recipe = engine.getRecipe(config.view.$type);
	if (!recipe) {
		throw new Error(`Form '${config.id}' uses view '${config.view.$type}' but the engine has no such recipe.`);
	}
	return recipe;
}

/** Projects the form's steps and their live state onto the {@link ViewStep} list, every step in order. */
export function projectViewSteps(
	steps: ReadonlyArray<{ id: string; title?: string; description?: string }>,
	states: readonly FormStepState[],
	current: string,
): ViewStep[] {
	const total = states.filter(({ skipped }) => !skipped).length;
	let position = 0;
	return steps.map((step) => {
		const state = states.find(({ id }) => id === step.id);
		const skipped = state?.skipped ?? false;
		return {
			id: step.id,
			title: step.title,
			description: step.description,
			index: skipped ? -1 : position++,
			total,
			isActive: step.id === current,
			isCompleted: state?.complete ?? false,
			isInvalid: state?.invalid ?? false,
			isVisited: state?.visited ?? false,
			isSkipped: skipped,
		};
	});
}

/** The navigation a recipe block reads, from the step states and the commands of a runtime. */
export function createViewNavigation(
	states: readonly FormStepState[],
	current: string,
	commands: { next: () => unknown; back: () => unknown; goTo: (id: string) => unknown },
	mode: StepNavigationMode = 'linear',
): ViewNavigation {
	const canGoNext = stepAfter(states, current) !== undefined;
	const canGoPrevious = stepBefore(states, current) !== undefined;
	const at = states.findIndex(({ id }) => id === current);
	return {
		canGoNext,
		canGoPrevious,
		isFirstStep: !canGoPrevious,
		isLastStep: !canGoNext,
		canGoToStep: (stepId) => {
			const to = states.findIndex(({ id }) => id === stepId);
			const target = states[to];
			if (!target || target.skipped || to === at) return false;
			return to < at || mode === 'free' || target.visited;
		},
		goToStep: (stepId) => void commands.goTo(stepId),
		goToNextStep: () => void commands.next(),
		goToPreviousStep: () => void commands.back(),
	};
}

export function buildViewModel({
	config,
	kind,
	states,
	current,
	navigation,
	isSubmitting,
	viewConfig,
}: {
	config: FormConfigView;
	kind: RecipeKind;
	states: readonly FormStepState[];
	current: string;
	navigation: ViewNavigation;
	isSubmitting?: boolean;
	viewConfig: Record<string, unknown>;
}): ViewModel {
	const allSteps = projectViewSteps(config.steps, states, current);
	const steps = allSteps.filter(({ isSkipped }) => !isSkipped);
	const activeStep = steps.find(({ isActive }) => isActive) ?? steps[0];
	if (!activeStep) {
		throw new Error(`Form '${config.id}' has no steps.`);
	}

	return {
		kind,
		form: {
			id: config.id,
			title: config.title,
			description: config.description,
			isSubmitting: isSubmitting ?? false,
		},
		steps,
		allSteps,
		activeStep,
		currentStepIndex: activeStep.index,
		navigation,
		viewConfig,
	};
}

export function buildViewSteps(
	steps: ReadonlyArray<{ id: string; title?: string; description?: string }>,
	currentStep: number,
	stepStates: StepStates,
): ViewStep[] {
	return steps.map((step, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: steps.length,
		isActive: index === currentStep,
		isCompleted: stepStates.completed[index] ?? false,
		isInvalid: !(stepStates.valid[index] ?? false),
		isVisited: stepStates.visited[index] ?? false,
		isSkipped: false,
	}));
}
