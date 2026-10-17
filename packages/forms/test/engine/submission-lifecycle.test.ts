import { describe, expect, test } from 'vitest';
import type { ActionDispatchInput, ActionExecutionResult } from '@schema-engine/actions';
import { runSubmissionLifecycle } from '@/index';
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
		.filter((action) => action.triggers?.includes(trigger))
		.map((action) =>
			action.id === 'second' ? { success: false, shouldContinue: false, error: 'Rejected' } : { success: true },
		);
}

describe('runSubmissionLifecycle', () => {
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
			dispatchedIds.push(...dispatched.map((action) => action.id));
			return dispatched.map(() => ({ success: true }));
		};

		const result = await runSubmissionLifecycle(dispatch, {
			actions,
			context,
			onAction: () => Promise.reject(new Error('Callback stopped submission')),
		});

		expect(dispatchedIds).toEqual(['first']);
		expect(result.succeeded).toBe(false);
		expect(result.results).toEqual([
			{ actionId: 'first', success: false, shouldContinue: false, error: 'Callback stopped submission' },
		]);
	});
});
