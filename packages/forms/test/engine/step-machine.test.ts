import { describe, expect, test, vi } from 'vitest';
import { createInitialStepStates, createStepMachine, createStepNavigator, type StepMachineState } from '@/index';

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

describe('createStepNavigator', () => {
	const setup = (valid: boolean, dispatch?: () => Promise<unknown>) => {
		let state: StepMachineState = { currentStepIndex: 0, ...createInitialStepStates(3) };
		const log: string[] = [];
		const navigate = createStepNavigator({
			reduce: createStepMachine({ steps: [{}, {}, {}] }),
			getState: () => state,
			setState: (next) => {
				state = next;
				log.push(`state ${next.currentStepIndex}`);
			},
			validateStep: async (index) => {
				log.push(`validate ${index}`);
				return valid;
			},
			dispatchTrigger: async (trigger) => {
				log.push(`${trigger} ${state.currentStepIndex}`);
				await dispatch?.();
			},
		});
		return { navigate, log };
	};

	test('dispatches leave before and change then enter after the step changes', async () => {
		const { navigate, log } = setup(true);

		await navigate({ type: 'next' });

		expect(log).toEqual(['validate 0', 'step_leave 0', 'state 1', 'step_change 1', 'step_enter 1']);
	});

	test('dispatches no step trigger when validation keeps the step', async () => {
		const { navigate, log } = setup(false);

		await navigate({ type: 'next' });

		expect(log).toEqual(['validate 0', 'state 0']);
	});

	test('ignores a request made while another is in flight', async () => {
		const { navigate, log } = setup(true);

		await Promise.all([navigate({ type: 'next' }), navigate({ type: 'next' })]);

		expect(log.filter((entry) => entry.startsWith('validate'))).toEqual(['validate 0']);
		expect(log.at(-1)).toBe('step_enter 1');
	});

	test('accepts navigation again after a trigger rejects', async () => {
		const dispatch = vi.fn<() => Promise<unknown>>().mockRejectedValueOnce(new Error('action failed'));
		const { navigate, log } = setup(true, dispatch);

		await expect(navigate({ type: 'next' })).rejects.toThrow('action failed');
		await navigate({ type: 'next' });

		expect(log.at(-1)).toBe('step_enter 1');
	});
});
