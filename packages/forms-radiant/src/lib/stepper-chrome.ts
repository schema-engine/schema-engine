import type { SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import type { WritableSignal } from '@ecopages/signals';
import type { StepData } from '@/components/steppers/types';
import type { StepperContextValue } from '@/contexts/stepper-context';

export type StepperChromeView = {
	currentStepIndex: number;
	totalSteps: number;
	currentTitle: string;
	currentDescription: string;
	descriptionHidden: boolean;
	isFirstStep: boolean;
	isLastStep: boolean;
	lastStepFlag: 'true' | 'false';
	canGoNext: boolean;
	nextDisabled: boolean;
	isSubmitting: boolean;
	submitLabel: string;
	stepChip: string;
	progressValue: number;
	progressLabel: string;
	completed: boolean[];
	visited: boolean[];
	titles: string[];
};

export type StepButtonChrome = {
	state: 'idle' | 'active' | 'completed';
	disabled: boolean;
	ariaCurrent: 'step' | 'false';
	title: string;
};

export const EMPTY_STEPPER_CHROME: StepperChromeView = {
	currentStepIndex: 0,
	totalSteps: 0,
	currentTitle: 'Step 1',
	currentDescription: '',
	descriptionHidden: true,
	isFirstStep: true,
	isLastStep: true,
	lastStepFlag: 'true',
	canGoNext: false,
	nextDisabled: true,
	isSubmitting: false,
	submitLabel: 'Submit',
	stepChip: 'Step 1 of 0',
	progressValue: 0,
	progressLabel: '0%',
	completed: [],
	visited: [],
	titles: [],
};

export function createStepperChromeView(context: StepperContextValue): StepperChromeView {
	const steps = context.steps ?? [];
	const currentStepIndex = context.currentStepIndex ?? 0;
	const current = steps[currentStepIndex];
	const totalSteps = Math.max(steps.length, 1);
	const navigation = context.navigation;
	const isSubmitting = Boolean(context.form?.isSubmitting);
	const isLastStep = navigation?.isLastStep ?? currentStepIndex >= steps.length - 1;
	const canGoNext = navigation?.canGoNext ?? currentStepIndex < steps.length - 1;
	const progressValue = ((currentStepIndex + 1) / totalSteps) * 100;

	return {
		currentStepIndex,
		totalSteps: steps.length,
		currentTitle: current?.title || `Step ${currentStepIndex + 1}`,
		currentDescription: current?.description ?? '',
		descriptionHidden: !current?.description,
		isFirstStep: navigation?.isFirstStep ?? currentStepIndex === 0,
		isLastStep,
		lastStepFlag: isLastStep ? 'true' : 'false',
		canGoNext,
		nextDisabled: !canGoNext,
		isSubmitting,
		submitLabel: isSubmitting ? 'Submitting...' : 'Submit',
		stepChip: `Step ${currentStepIndex + 1} of ${steps.length}`,
		progressValue,
		progressLabel: `${Math.round(progressValue)}%`,
		completed: steps.map((step) => Boolean(step.isCompleted)),
		visited: steps.map((step) => Boolean(step.isVisited)),
		titles: steps.map((step, index) => step.title || `Step ${index + 1}`),
	};
}

export function stepperStructureKey(steps: StepData[], config: Record<string, unknown> | undefined): string {
	return `${steps.map((step) => step.id).join('\0')}|${JSON.stringify({
		orientation: config?.orientation,
		showStepNumbers: config?.showStepNumbers,
		showStepTitles: config?.showStepTitles,
		showStepDescriptions: config?.showStepDescriptions,
		showProgress: config?.showProgress,
	})}`;
}

export function stepButtonChrome(view: StepperChromeView, index: number): StepButtonChrome {
	const isCompleted = Boolean(view.completed[index]);
	const isActive = view.currentStepIndex === index;
	return {
		state: isCompleted ? 'completed' : isActive ? 'active' : 'idle',
		disabled: !view.visited[index] && index > view.currentStepIndex,
		ariaCurrent: isActive ? 'step' : 'false',
		title: view.titles[index] ?? `Step ${index + 1}`,
	};
}

function sameBools(left: boolean[], right: boolean[]): boolean {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameStrings(left: string[], right: string[]): boolean {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function sameStepperChrome(left: StepperChromeView, right: StepperChromeView): boolean {
	return (
		left.currentStepIndex === right.currentStepIndex &&
		left.totalSteps === right.totalSteps &&
		left.currentTitle === right.currentTitle &&
		left.currentDescription === right.currentDescription &&
		left.descriptionHidden === right.descriptionHidden &&
		left.isFirstStep === right.isFirstStep &&
		left.isLastStep === right.isLastStep &&
		left.lastStepFlag === right.lastStepFlag &&
		left.canGoNext === right.canGoNext &&
		left.nextDisabled === right.nextDisabled &&
		left.isSubmitting === right.isSubmitting &&
		left.submitLabel === right.submitLabel &&
		left.stepChip === right.stepChip &&
		left.progressValue === right.progressValue &&
		left.progressLabel === right.progressLabel &&
		sameBools(left.completed, right.completed) &&
		sameBools(left.visited, right.visited) &&
		sameStrings(left.titles, right.titles)
	);
}

export type StepButtonBinding = SubscribableJsxValueWithAccess<StepButtonChrome>;

export function createStepButtonBindings(
	viewBinding: SubscribableJsxValueWithAccess<StepperChromeView>,
	count: number,
): StepButtonBinding[] {
	return Array.from({ length: count }, (_, index) => viewBinding.map((view) => stepButtonChrome(view, index)));
}

export function syncStepperChromeView(view: WritableSignal<StepperChromeView>, next: StepperChromeView): void {
	if (!sameStepperChrome(view.get(), next)) {
		view.set(next);
	}
}
