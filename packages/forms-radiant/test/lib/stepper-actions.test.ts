import { describe, expect, test, vi } from 'vitest';
import {
	applyStepperAction,
	dispatchStepperAction,
	isStepperActionTarget,
	resolveStepperAction,
	routeStepperClick,
	STEPPER_ACTION_EVENT,
} from '@/lib/stepper-actions';

function clickEventFrom(element: Element): Event {
	return {
		composedPath: () => [element, document.body, document],
		stopPropagation() {},
	} as unknown as Event;
}

describe('resolveStepperAction', () => {
	test('reads next from the composed path', () => {
		const button = document.createElement('button');
		button.setAttribute('data-se-stepper', 'next');

		expect(resolveStepperAction(clickEventFrom(button))).toEqual({ action: 'next' });
	});
});

describe('isStepperActionTarget', () => {
	test('rejects empty provider placeholders', () => {
		expect(isStepperActionTarget({})).toBe(false);
		expect(
			isStepperActionTarget({
				goToNextStep: () => undefined,
				goToPreviousStep: () => undefined,
				goToStep: () => undefined,
			}),
		).toBe(true);
	});
});

describe('applyStepperAction', () => {
	test('calls goToNextStep', () => {
		const goToNextStep = vi.fn();
		applyStepperAction(
			{
				goToNextStep,
				goToPreviousStep: vi.fn(),
				goToStep: vi.fn(),
			},
			{ action: 'next' },
		);
		expect(goToNextStep).toHaveBeenCalledOnce();
	});
});

describe('routeStepperClick', () => {
	test('prefers form instance and does not emit', () => {
		const goToNextStep = vi.fn();
		const emit = vi.fn();
		const button = document.createElement('button');
		button.setAttribute('data-se-stepper', 'next');

		routeStepperClick(
			clickEventFrom(button),
			{
				goToNextStep,
				goToPreviousStep: vi.fn(),
				goToStep: vi.fn(),
			},
			undefined,
			emit,
		);

		expect(goToNextStep).toHaveBeenCalledOnce();
		expect(emit).not.toHaveBeenCalled();
	});

	test('emits when no navigation target exists', () => {
		const emit = vi.fn();
		const button = document.createElement('button');
		button.setAttribute('data-se-stepper', 'previous');

		routeStepperClick(clickEventFrom(button), {}, undefined, emit);

		expect(emit).toHaveBeenCalledWith({ action: 'previous' });
	});
});

describe('dispatchStepperAction', () => {
	test('emits a composed stepper action event', () => {
		const host = document.createElement('div');
		const listener = vi.fn();
		host.addEventListener(STEPPER_ACTION_EVENT, listener);

		dispatchStepperAction(host, { action: 'previous' });

		expect(listener).toHaveBeenCalledOnce();
	});
});
