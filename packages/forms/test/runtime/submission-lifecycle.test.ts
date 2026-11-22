import { describe, expect, test, vi } from 'vitest';
import type { ActionDispatchInput, ActionExecutionResult } from '@schema-engine/actions';
import { runSubmissionLifecycle } from '@/runtime/submission-lifecycle';
import type { FormActionTrigger } from '@/actions';
import type { BuilderActionBaseContext } from '@/types';

const context = {} as BuilderActionBaseContext;
const saveAction = { $type: 'submit', id: 'save', enabled: true, endpoint: '/save', method: 'POST' } as const;

function createDispatch(submitResults: ActionExecutionResult[]) {
	const triggers: FormActionTrigger[] = [];
	const dispatch = async ({ trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
		triggers.push(trigger as FormActionTrigger);
		return trigger === 'form_submit' ? submitResults : [];
	};
	return { dispatch, triggers };
}

async function dispatchSuccessfulSubmitActions({
	actions,
	trigger,
}: ActionDispatchInput): Promise<ActionExecutionResult[]> {
	return trigger === 'form_submit' ? actions.map(() => ({ success: true })) : [];
}

/** Runs only the actions whose triggers include the dispatched one, as the dispatcher does. */
async function dispatchRejectingSecond({ actions, trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> {
	return actions
		.filter((action) => 'id' in action && action.triggers?.includes(trigger))
		.map((action) =>
			'id' in action && action.id === 'second'
				? { success: false, shouldContinue: false, error: 'Rejected' }
				: { success: true },
		);
}

describe('runSubmissionLifecycle', () => {
	test('builds no context and dispatches nothing for triggers no action answers', async () => {
		const { dispatch, triggers } = createDispatch([]);
		const buildContext = vi.fn(() => context);

		const result = await runSubmissionLifecycle(dispatch, {
			actions: [saveAction],
			context: buildContext,
			hasMatching: () => false,
		});

		expect(result).toEqual({ succeeded: true, results: [] });
		expect(triggers).toEqual([]);
		expect(buildContext).not.toHaveBeenCalled();
	});

	test('dispatches only the triggers that have matching actions', async () => {
		const { dispatch, triggers } = createDispatch([{ success: true }]);

		await runSubmissionLifecycle(dispatch, {
			actions: [saveAction],
			context,
			hasMatching: (_actions, trigger) => trigger === 'form_submit' || trigger === 'form_submit_complete',
		});

		expect(triggers).toEqual(['form_submit', 'form_submit_complete']);
	});

	test('treats an action that stops on failure as a failed submission', async () => {
		const { dispatch, triggers } = createDispatch([{ success: false, shouldContinue: false }]);

		const result = await runSubmissionLifecycle(dispatch, { actions: [saveAction], context });

		expect(result).toEqual({
			succeeded: false,
			results: [{ actionId: 'save', success: false, shouldContinue: false }],
		});
		expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete']);
	});

	test('allows a failed action to continue the submission when requested', async () => {
		const { dispatch, triggers } = createDispatch([{ success: false, shouldContinue: true }]);

		const result = await runSubmissionLifecycle(dispatch, { actions: [saveAction], context });

		expect(result.succeeded).toBe(true);
		expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_success', 'form_submit_complete']);
	});

	test('rebuilds context before each lifecycle trigger when given a context factory', async () => {
		const contexts = [
			{ ...context, formData: { phase: 'start' } },
			{ ...context, formData: { phase: 'submit' } },
			{ ...context, formData: { phase: 'success' } },
			{ ...context, formData: { phase: 'complete' } },
		];
		const dispatchedContexts: BuilderActionBaseContext[] = [];
		let contextIndex = 0;
		const dispatch = async ({
			context: dispatchedContext,
		}: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
			dispatchedContexts.push(dispatchedContext as BuilderActionBaseContext);
			return [];
		};

		await runSubmissionLifecycle(dispatch, {
			actions: [saveAction],
			context: () => contexts[contextIndex++] ?? context,
		});

		expect(dispatchedContexts).toEqual(contexts);
	});

	test('submission errors name the failing action', async () => {
		const actions = [
			{ ...saveAction, id: 'first', triggers: ['form_submit'] },
			{ ...saveAction, id: 'later', triggers: ['form_mount'] },
			{ ...saveAction, id: 'second', triggers: ['form_submit'] },
		];

		const result = await runSubmissionLifecycle(dispatchRejectingSecond, { actions, context });

		expect(result).toEqual({
			succeeded: false,
			results: [
				{ actionId: 'first', success: true },
				{ actionId: 'second', success: false, shouldContinue: false, error: 'Rejected' },
			],
		});
	});

	test('runs onAction after each successful submit action', async () => {
		const actions = [
			{ $type: 'submit', id: 'first', enabled: true, endpoint: '/save', method: 'POST' },
			{ $type: 'submit', id: 'second', enabled: true, endpoint: '/save', method: 'POST' },
		] as const;
		const onActionCalls: Array<{ actionId: string; data: Record<string, unknown> }> = [];
		await runSubmissionLifecycle(dispatchSuccessfulSubmitActions, {
			actions,
			context: { ...context, formData: { name: 'Ada' } },
			onAction: (action, data) => {
				onActionCalls.push({ actionId: action.id, data });
			},
		});

		expect(onActionCalls).toEqual([
			{ actionId: 'first', data: { name: 'Ada' } },
			{ actionId: 'second', data: { name: 'Ada' } },
		]);
	});

	test('turns an onAction rejection into a fatal submit result and stops later actions', async () => {
		const actions = [
			{ $type: 'submit', id: 'first', enabled: true, endpoint: '/save', method: 'POST' },
			{ $type: 'submit', id: 'skipped', enabled: true, endpoint: '/save', method: 'POST' },
		] as const;
		const dispatchedIds: string[] = [];
		const dispatch = async ({
			actions: dispatched,
			trigger,
		}: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
			if (trigger !== 'form_submit') return [];
			dispatchedIds.push(...dispatched.map((action) => ('id' in action ? action.id : 'group')));
			return dispatched.map(() => ({ success: true }));
		};

		const result = await runSubmissionLifecycle(dispatch, {
			actions,
			context,
			onAction: () => Promise.reject(new Error('Callback stopped submission')),
		});

		expect(dispatchedIds).toEqual(['first']);
		expect(result.succeeded).toBe(false);
		expect(result.results).toMatchObject([
			{ actionId: 'first', success: false, shouldContinue: false, error: 'Callback stopped submission' },
		]);
	});

	describe('onSubmit', () => {
		test('runs after the submit actions and before the success trigger', async () => {
			const order: string[] = [];
			const dispatch = async ({ trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
				order.push(trigger as string);
				return trigger === 'form_submit' ? [{ success: true }] : [];
			};

			const result = await runSubmissionLifecycle(dispatch, {
				actions: [saveAction],
				context,
				onSubmit: () => {
					order.push('onSubmit');
				},
			});

			expect(result.succeeded).toBe(true);
			expect(order).toEqual([
				'form_submit_start',
				'form_submit',
				'onSubmit',
				'form_submit_success',
				'form_submit_complete',
			]);
		});

		test('is not called when a submit action aborts', async () => {
			const { dispatch, triggers } = createDispatch([{ success: false, shouldContinue: false }]);
			const onSubmit = vi.fn();

			const result = await runSubmissionLifecycle(dispatch, { actions: [saveAction], context, onSubmit });

			expect(result.succeeded).toBe(false);
			expect(result.failure).toBeUndefined();
			expect(onSubmit).not.toHaveBeenCalled();
			expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete']);
		});

		test('a rejection fails the submission, runs error and complete, and skips success', async () => {
			const { dispatch, triggers } = createDispatch([{ success: true }]);
			const failure = new Error('Save failed');

			const result = await runSubmissionLifecycle(dispatch, {
				actions: [saveAction],
				context,
				onSubmit: () => Promise.reject(failure),
			});

			expect(result).toMatchObject({ succeeded: false, failure: { phase: 'callback', error: failure } });
			expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete']);
		});

		test('runs for a form with no actions', async () => {
			const { dispatch, triggers } = createDispatch([]);
			const onSubmit = vi.fn();

			const result = await runSubmissionLifecycle(dispatch, {
				actions: [],
				context,
				hasMatching: () => false,
				onSubmit,
			});

			expect(result).toEqual({ succeeded: true, results: [] });
			expect(onSubmit).toHaveBeenCalledOnce();
			expect(triggers).toEqual([]);
		});
	});

	describe('a dispatcher that rejects', () => {
		const sequence = ['form_submit_start', 'form_submit', 'form_submit_success', 'form_submit_complete'];

		function rejectingAt(rejecting: FormActionTrigger) {
			const triggers: FormActionTrigger[] = [];
			const boom = new Error(`${rejecting} rejected`);
			const dispatch = async ({ trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
				triggers.push(trigger as FormActionTrigger);
				if (trigger === rejecting) throw boom;
				return trigger === 'form_submit' ? [{ success: true }] : [];
			};
			return { dispatch, triggers, boom };
		}

		test.each([
			['form_submit_start', ['form_submit_start', 'form_submit_error', 'form_submit_complete'], 0, false],
			[
				'form_submit',
				['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete'],
				0,
				false,
			],
			[
				'form_submit_success',
				[
					'form_submit_start',
					'form_submit',
					'form_submit_success',
					'form_submit_error',
					'form_submit_complete',
				],
				1,
				false,
			],
			['form_submit_complete', sequence, 1, true],
		] as const)(
			'at %s records the failure with each trigger tried once',
			async (rejecting, expected, submitCalls, succeeded) => {
				const { dispatch, triggers, boom } = rejectingAt(rejecting);
				const onSubmit = vi.fn();

				const result = await runSubmissionLifecycle(dispatch, { actions: [saveAction], context, onSubmit });

				expect(result).toMatchObject({ succeeded, failure: { phase: 'trigger', error: boom } });
				expect(triggers).toEqual(expected);
				expect(triggers.filter((trigger) => trigger === 'form_submit_complete')).toHaveLength(1);
				expect(onSubmit).toHaveBeenCalledTimes(submitCalls);
			},
		);

		test('at form_submit_error still dispatches complete once', async () => {
			const { dispatch, triggers, boom } = rejectingAt('form_submit_error');

			const result = await runSubmissionLifecycle(dispatch, {
				actions: [saveAction],
				context,
				onSubmit: () => Promise.reject(new Error('Save failed')),
			});

			expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete']);
			expect(result.failure).toEqual({
				phase: 'callback',
				error: expect.objectContaining({ message: 'Save failed' }),
			});
			expect(result.failure?.error).not.toBe(boom);
		});

		test('at form_submit_error after a failed action reports the dispatch failure', async () => {
			const triggers: FormActionTrigger[] = [];
			const boom = new Error('error rejected');
			const dispatch = async ({ trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
				triggers.push(trigger as FormActionTrigger);
				if (trigger === 'form_submit_error') throw boom;
				return trigger === 'form_submit' ? [{ success: false, shouldContinue: false }] : [];
			};

			const result = await runSubmissionLifecycle(dispatch, { actions: [saveAction], context });

			expect(result.failure).toEqual({ phase: 'trigger', error: boom });
			expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete']);
		});

		test('a rejecting complete after an earlier failure keeps the first failure', async () => {
			const triggers: FormActionTrigger[] = [];
			const first = new Error('start rejected');
			const dispatch = async ({ trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
				triggers.push(trigger as FormActionTrigger);
				if (trigger === 'form_submit_start') throw first;
				if (trigger === 'form_submit_complete') throw new Error('complete rejected');
				return [];
			};

			const result = await runSubmissionLifecycle(dispatch, { actions: [saveAction], context });

			expect(result.failure).toEqual({ phase: 'trigger', error: first });
			expect(triggers.filter((trigger) => trigger === 'form_submit_complete')).toHaveLength(1);
		});
	});
});
