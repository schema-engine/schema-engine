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

export function getSlotConfig<TConfig = Record<string, unknown>>(
	viewConfig: Record<string, unknown>,
	slot: RecipeSlot,
): TConfig {
	return ((viewConfig[slot] as TConfig | undefined) ?? {}) as TConfig;
}

export function applySlotDefaults(
	viewConfig: Record<string, unknown>,
	defaults?: Partial<Record<RecipeSlot, Record<string, unknown>>>,
): Record<string, unknown> {
	if (!defaults) return viewConfig;

	const next = { ...viewConfig };
	for (const [slot, slotDefaults] of Object.entries(defaults)) {
		next[slot] = {
			...slotDefaults,
			...(viewConfig[slot] as Record<string, unknown> | undefined),
		};
	}
	return next;
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
	const steps: ViewStep[] = config.steps.map((step, index) => ({
		id: step.id,
		title: step.title,
		description: step.description,
		index,
		total: config.steps.length,
		isActive: index === currentStepIndex,
		isCompleted: stepStates?.completed[index] ?? false,
		isValid: stepStates?.valid[index] ?? false,
		isVisited: stepStates?.visited[index] ?? false,
	}));

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
