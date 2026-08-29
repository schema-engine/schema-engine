import { describe, expect, test } from 'vitest';
import {
	createStepperChromeView,
	EMPTY_STEPPER_CHROME,
	sameStepperChrome,
	stepButtonChrome,
	stepperStructureKey,
} from '@/lib/stepper-chrome';
import type { StepperContextValue } from '@/contexts/stepper-context';

function context(overrides: Partial<StepperContextValue> = {}): StepperContextValue {
	return {
		steps: [
			{
				id: 'one',
				title: 'One',
				index: 0,
				total: 2,
				isActive: true,
				isCompleted: false,
				isValid: false,
				isVisited: true,
			},
			{
				id: 'two',
				title: 'Two',
				index: 1,
				total: 2,
				isActive: false,
				isCompleted: false,
				isValid: false,
				isVisited: false,
			},
		],
		currentStepIndex: 0,
		navigation: {
			canGoNext: true,
			canGoPrevious: false,
			isFirstStep: true,
			isLastStep: false,
			goToStep: () => undefined,
			goToNextStep: () => undefined,
			goToPreviousStep: () => undefined,
		},
		form: { id: 'form' },
		config: {},
		...overrides,
	};
}

describe('createStepperChromeView', () => {
	test('projects titles, chip, and next disabled from context', () => {
		const view = createStepperChromeView(context());
		expect(view.currentTitle).toBe('One');
		expect(view.stepChip).toBe('Step 1 of 2');
		expect(view.nextDisabled).toBe(false);
		expect(view.descriptionHidden).toBe(true);
	});

	test('marks the last step for submit chrome', () => {
		const view = createStepperChromeView(
			context({
				currentStepIndex: 1,
				navigation: {
					canGoNext: false,
					canGoPrevious: true,
					isFirstStep: false,
					isLastStep: true,
					goToStep: () => undefined,
					goToNextStep: () => undefined,
					goToPreviousStep: () => undefined,
				},
			}),
		);
		expect(view.isLastStep).toBe(true);
		expect(view.currentTitle).toBe('Two');
		expect(view.nextDisabled).toBe(true);
	});
});

describe('stepButtonChrome', () => {
	test('disables unvisited future steps', () => {
		const view = createStepperChromeView(context());
		expect(stepButtonChrome(view, 0)).toMatchObject({ state: 'active', disabled: false, ariaCurrent: 'step' });
		expect(stepButtonChrome(view, 1)).toMatchObject({ state: 'idle', disabled: true, ariaCurrent: 'false' });
	});
});

describe('stepperStructureKey', () => {
	test('changes when step ids or layout config change', () => {
		const steps = context().steps;
		expect(stepperStructureKey(steps, { orientation: 'horizontal' })).not.toBe(
			stepperStructureKey(steps, { orientation: 'sidebar' }),
		);
	});
});

describe('sameStepperChrome', () => {
	test('treats a cloned empty chrome as equal', () => {
		expect(sameStepperChrome(EMPTY_STEPPER_CHROME, { ...EMPTY_STEPPER_CHROME })).toBe(true);
	});
});
