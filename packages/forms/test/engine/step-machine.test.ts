import { describe, expect, test } from 'vitest';
import {
	activeStepIds,
	deriveStepStates,
	moveProgress,
	startProgress,
	stepAfter,
	stepBefore,
	stepsWithErrors,
	type FormStepState,
} from '@/engine/step-machine';

const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

const states = (skipped: string[] = []): FormStepState[] =>
	deriveStepStates(steps, startProgress('a'), { skipped, invalid: [] }, 'linear');

describe('startProgress', () => {
	test('has the first step current and visited, and nothing complete', () => {
		expect(startProgress('a')).toEqual({ current: 'a', visited: ['a'], complete: [] });
	});
});

describe('moveProgress', () => {
	test('makes the target current and visited, and marks the completed steps, by id', () => {
		const moved = moveProgress(startProgress('a'), 'c', ['a']);
		expect(moved).toEqual({ current: 'c', visited: ['a', 'c'], complete: ['a'] });
	});

	test('keeps what was visited and completed, and adds each id once', () => {
		const first = moveProgress(startProgress('a'), 'b', ['a']);
		const back = moveProgress(first, 'a');
		const again = moveProgress(back, 'b', ['a', 'b']);
		expect(again).toEqual({ current: 'b', visited: ['a', 'b'], complete: ['a', 'b'] });
	});

	test('returns the same progress when nothing changes', () => {
		const progress = startProgress('a');
		expect(moveProgress(progress, 'a')).toBe(progress);
	});
});

describe('deriveStepStates', () => {
	test('stores only visited and complete, and takes skipped and invalid from what it is given', () => {
		const progress = moveProgress(startProgress('a'), 'c', ['a']);
		expect(deriveStepStates(steps, progress, { skipped: ['b'], invalid: ['c'] }, 'linear')).toEqual([
			{ id: 'a', skipped: false, visited: true, complete: true, invalid: false, reachable: true },
			{ id: 'b', skipped: true, visited: false, complete: false, invalid: false, reachable: false },
			{ id: 'c', skipped: false, visited: true, complete: false, invalid: true, reachable: false },
			{ id: 'd', skipped: false, visited: false, complete: false, invalid: false, reachable: false },
		]);
	});

	test('a step is reachable going back always, and going forward when visited, or when the form is free', () => {
		const progress = moveProgress(startProgress('a'), 'b', ['a']);
		const reachable = (mode: 'linear' | 'free') =>
			deriveStepStates(steps, progress, { skipped: ['c'], invalid: [] }, mode).map((step) => step.reachable);
		expect(reachable('linear')).toEqual([true, false, false, false]);
		expect(reachable('free')).toEqual([true, false, false, true]);
	});
});

describe('active steps', () => {
	test('lists the steps that are not skipped, in order', () => {
		expect(activeStepIds(states(['b', 'c']))).toEqual(['a', 'd']);
	});

	test('stepAfter and stepBefore pass over skipped steps and end at the first and last', () => {
		expect(stepAfter(states(['b', 'c']), 'a')).toBe('d');
		expect(stepAfter(states(['b', 'c']), 'd')).toBeUndefined();
		expect(stepBefore(states(['b', 'c']), 'd')).toBe('a');
		expect(stepBefore(states(['b', 'c']), 'a')).toBeUndefined();
	});

	test('a skipped step still has a nearest active step on each side', () => {
		expect(stepBefore(states(['c']), 'c')).toBe('b');
		expect(stepAfter(states(['c']), 'c')).toBe('d');
	});
});

describe('stepsWithErrors', () => {
	const form = [
		{ id: 'one', elements: [{ name: 'email' }, { name: 'tags', $type: 'input' }] },
		{ id: 'two', elements: [{ name: 'street' }] },
	];

	test('lists the steps with an error at one of their fields', () => {
		expect(stepsWithErrors(form, {}, { street: {} })).toEqual(['two']);
		expect(stepsWithErrors(form, {}, { email: {}, street: {} })).toEqual(['one', 'two']);
		expect(stepsWithErrors(form, {}, {})).toEqual([]);
	});

	test('does not count an error that belongs to no field of a step, such as the form itself', () => {
		expect(stepsWithErrors(form, {}, { __root__: {} })).toEqual([]);
	});
});
