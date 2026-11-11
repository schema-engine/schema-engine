import * as z from 'zod/mini';
import type { FormConfigView } from '@/lib/normalized-form-config';
import type { StepStates } from '@/engine/step-machine';
import type { RecipeKind, RecipeSlot } from './types';

export interface ViewNavigation {
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	goToStep: (stepIndex: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
}

export interface ViewStep {
	id: string;
	title?: string;
	description?: string;
	index: number;
	total: number;
	isActive: boolean;
	isCompleted: boolean;
	isValid: boolean;
	isVisited: boolean;
}

export interface ViewModel {
	kind: RecipeKind;
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting: boolean;
	};
	steps: ViewStep[];
	activeStep: ViewStep;
	currentStepIndex: number;
	navigation: ViewNavigation;
	viewConfig: Record<string, unknown>;
}

/**
 * Reads one slot's complete config from a view.
 *
 * @remarks
 * A normalized view already holds the schema output, so the parse is a no-op there; it also
 * fills the schema defaults for a view that was not normalized, such as a serialized or
 * hand-built one, instead of returning a partial config typed as complete. Throws a Zod error
 * when the slot config is invalid.
 */
export function getSlotConfig<TSchema extends z.ZodMiniType>(
	viewConfig: Record<string, unknown>,
	slot: RecipeSlot,
	schema: TSchema,
): z.output<TSchema> {
	return z.parse(schema, viewConfig[slot] ?? {});
}

/** Projects form steps and the live step state onto the {@link ViewStep} list both renderers expose to recipe blocks. */
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
		isValid: stepStates.valid[index] ?? false,
		isVisited: stepStates.visited[index] ?? false,
	}));
}

export function buildViewModel({
	config,
	kind,
	currentStepIndex,
	navigation,
	isSubmitting,
	viewConfig,
	stepStates,
}: {
	config: FormConfigView;
	kind: RecipeKind;
	currentStepIndex: number;
	navigation: ViewNavigation;
	isSubmitting?: boolean;
	viewConfig: Record<string, unknown>;
	stepStates: StepStates;
}): ViewModel {
	const steps = buildViewSteps(config.steps, currentStepIndex, stepStates);

	const activeStep = steps[currentStepIndex] ?? steps[0];
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
		currentStepIndex,
		navigation,
		viewConfig,
	};
}
