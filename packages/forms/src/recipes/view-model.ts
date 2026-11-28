import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FormConfigView } from '../lib/normalized-form-config.js';
import { stepAfter, stepBefore, type FormStepState } from '../engine/step-machine.js';
import type { RecipeRegistry } from '../registries/index.js';
import type { AnyRecipeRegistration } from '../types/registration.js';
import { readSlotConfig, type RecipeViewModel } from '@schema-engine/layout';
import type { RecipeKind, RecipeSlot } from './types.js';

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
	/** Whether `goToStep(stepId)` can move there, as the runtime's step state says. */
	canGoToStep: (stepId: string) => boolean;
	goToStep: (stepId: string) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

/**
 * One step that is not skipped, as a recipe block reads it.
 *
 * @remarks `index` is the position among the steps that are not skipped and `total` how many there are, so progress reads "step 2 of 3" however many are skipped.
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
	activeStep: ViewStep;
	/** The position of the current step among `steps`. */
	currentStepIndex: number;
	navigation: ViewNavigation;
}

/**
 * Reads one slot's complete config from a normalized view; see the layout `readSlotConfig`, which this
 * types by the forms slot names.
 */
export function getSlotConfig<TSchema extends StandardSchemaV1>(
	viewConfig: Record<string, unknown>,
	slot: RecipeSlot,
	schema: TSchema,
): StandardSchemaV1.InferOutput<TSchema> {
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
	engine: { readonly recipes: RecipeRegistry },
	config: { id: string; view?: { $type: string } },
): AnyRecipeRegistration | undefined {
	if (!config.view) return undefined;
	const recipe = engine.recipes.get(config.view.$type);
	if (!recipe) {
		throw new Error(`Form '${config.id}' uses view '${config.view.$type}' but the engine has no such recipe.`);
	}
	return recipe;
}

/** Projects the steps that are not skipped, with their live state, onto the {@link ViewStep} list. */
export function projectViewSteps(
	steps: ReadonlyArray<{ id: string; title?: string; description?: string }>,
	states: readonly FormStepState[],
	current: string,
): ViewStep[] {
	const active = steps.flatMap((step) => {
		const state = states.find(({ id }) => id === step.id);
		return state?.skipped ? [] : [{ step, state }];
	});
	return active.map(({ step, state }, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: active.length,
		isActive: step.id === current,
		isCompleted: state?.complete ?? false,
		isInvalid: state?.invalid ?? false,
		isVisited: state?.visited ?? false,
	}));
}

/** The navigation a recipe block reads, from the step states and the commands of a runtime. */
export function createViewNavigation(
	states: readonly FormStepState[],
	current: string,
	commands: { next: () => unknown; back: () => unknown; goTo: (id: string) => unknown },
): ViewNavigation {
	const canGoNext = stepAfter(states, current) !== undefined;
	const canGoPrevious = stepBefore(states, current) !== undefined;
	return {
		canGoNext,
		canGoPrevious,
		isFirstStep: !canGoPrevious,
		isLastStep: !canGoNext,
		canGoToStep: (stepId) => states.find(({ id }) => id === stepId)?.reachable ?? false,
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
	const steps = projectViewSteps(config.steps, states, current);
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
		activeStep,
		currentStepIndex: activeStep.index,
		navigation,
		viewConfig,
	};
}
