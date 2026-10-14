import { describe, expect, test } from 'vitest';
import { createInitialStepStates, createStepMachine } from '@/index';

describe('createInitialStepStates', () => {
	test('starts at the first visited step', () => {
		expect(createInitialStepStates(3)).toEqual({
			completed: [false, false, false],
			valid: [false, false, false],
			visited: [true, false, false],
		});
	});
});

describe('createStepMachine', () => {
	const reducer = createStepMachine({ steps: [{}, {}, {}] });

	test('keeps the active step when its validation fails', () => {
		const state = { currentStepIndex: 0, ...createInitialStepStates(3) };

		const next = reducer(state, { type: 'next', isValid: false });

		expect(next.currentStepIndex).toBe(0);
		expect(next.completed[0]).toBe(false);
		expect(next.valid[0]).toBe(false);
	});

	test('does not advance past the last step', () => {
		const state = { currentStepIndex: 2, ...createInitialStepStates(3) };

		const next = reducer(state, { type: 'next', isValid: true });

		expect(next.currentStepIndex).toBe(2);
	});

	test('marks a step visited when navigation enters it', () => {
		const state = { currentStepIndex: 0, ...createInitialStepStates(3) };

		const next = reducer(state, { type: 'next', isValid: true });
		const later = reducer(next, { type: 'go-to', index: 2 });

		expect(next.completed[0]).toBe(true);
		expect(next.visited).toEqual([true, true, false]);
		expect(later.currentStepIndex).toBe(2);
		expect(later.visited).toEqual([true, true, true]);
	});

	test('marks a previously unvisited step as visited when moving back to it', () => {
		const initial = { currentStepIndex: 0, ...createInitialStepStates(3) };
		const later = reducer(initial, { type: 'go-to', index: 2 });
		const previous = reducer(later, { type: 'previous' });

		expect(later.visited).toEqual([true, false, true]);
		expect(previous.currentStepIndex).toBe(1);
		expect(previous.visited).toEqual([true, true, true]);
	});

	test('ignores navigation outside the configured steps', () => {
		const state = { currentStepIndex: 0, ...createInitialStepStates(3) };

		expect(reducer(state, { type: 'go-to', index: 3 })).toBe(state);
	});
});
