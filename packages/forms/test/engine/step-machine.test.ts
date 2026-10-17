import { describe, expect, test, vi } from 'vitest';
import { createInitialStepStates, createStepMachine, createStepNavigator, type StepMachineState } from '@/index';

const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};

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
	const setup = (valid: boolean | (() => Promise<boolean>), dispatch?: (trigger: string) => Promise<unknown>) => {
		let state: StepMachineState = { currentStepIndex: 0, ...createInitialStepStates(3) };
		const log: string[] = [];
		const { navigate, cancel } = createStepNavigator({
			reduce: createStepMachine({ steps: [{}, {}, {}] }),
			getState: () => state,
			setState: (next) => {
				state = next;
				log.push(`state ${next.currentStepIndex}`);
			},
			validateStep: async (index) => {
				log.push(`validate ${index}`);
				return typeof valid === 'function' ? valid() : valid;
			},
			dispatchTrigger: async (trigger) => {
				log.push(`${trigger} ${state.currentStepIndex}`);
				await dispatch?.(trigger);
			},
		});
		return { navigate, cancel, log, state: () => state };
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

	test('a navigation cancelled while its step validates writes no state and dispatches no trigger', async () => {
		const validation = deferred<boolean>();
		const { navigate, cancel, log, state } = setup(() => validation.promise);

		const pending = navigate({ type: 'next' });
		cancel();
		validation.resolve(true);
		await pending;

		expect(log).toEqual(['validate 0']);
		expect(state().currentStepIndex).toBe(0);
	});

	test('a navigation cancelled during step_leave neither changes the step nor enters the next one', async () => {
		const leave = deferred<void>();
		const { navigate, cancel, log, state } = setup(true, () => leave.promise);

		const pending = navigate({ type: 'next' });
		await vi.waitFor(() => expect(log).toContain('step_leave 0'));
		cancel();
		leave.resolve();
		await pending;

		expect(log).toEqual(['validate 0', 'step_leave 0']);
		expect(state().currentStepIndex).toBe(0);
	});

	test('accepts a request after cancel while the cancelled navigation is still pending', async () => {
		const validation = deferred<boolean>();
		const { navigate, cancel, log } = setup(() => validation.promise);

		const stale = navigate({ type: 'next' });
		cancel();
		const fresh = navigate({ type: 'go-to', index: 2 });
		validation.resolve(true);
		await Promise.all([stale, fresh]);

		expect(log).toEqual(['validate 0', 'step_leave 0', 'state 2', 'step_change 2', 'step_enter 2']);
	});

	test('a navigation cancelled during step_change does not dispatch step_enter', async () => {
		let cancelNavigation: (() => void) | undefined;
		const { navigate, cancel, log } = setup(true, async (trigger) => {
			if (trigger === 'step_change') cancelNavigation?.();
		});
		cancelNavigation = cancel;

		await navigate({ type: 'next' });

		expect(log).toEqual(['validate 0', 'step_leave 0', 'state 1', 'step_change 1']);
	});

	test('a cancelled navigation that settles leaves the next navigation in flight', async () => {
		const validation = deferred<boolean>();
		const leave = deferred<void>();
		const { navigate, cancel, log } = setup(
			() => validation.promise,
			() => leave.promise,
		);

		const stale = navigate({ type: 'next' });
		cancel();
		const fresh = navigate({ type: 'go-to', index: 2 });
		validation.resolve(true);
		await stale;
		const ignored = navigate({ type: 'go-to', index: 1 });
		leave.resolve();
		await Promise.all([fresh, ignored]);

		expect(log).toEqual(['validate 0', 'step_leave 0', 'state 2', 'step_change 2', 'step_enter 2']);
	});
});
