import { describe, expect, test } from 'vitest';
import type { ActionDispatchInput, ActionExecutionResult } from '@schema-engine/actions';
import { runSubmissionLifecycle } from '@/index';
import type { FormActionTrigger } from '@/actions';
import type { BuilderActionBaseContext } from '@/types';

const context = {} as BuilderActionBaseContext;

function createDispatch(submitResults: ActionExecutionResult[]) {
	const triggers: FormActionTrigger[] = [];
	const dispatch = async ({ trigger }: ActionDispatchInput): Promise<ActionExecutionResult[]> => {
		triggers.push(trigger as FormActionTrigger);
		return trigger === 'form_submit' ? submitResults : [];
	};
	return { dispatch, triggers };
}

describe('runSubmissionLifecycle', () => {
	test('treats an action that stops on failure as a failed submission', async () => {
		const { dispatch, triggers } = createDispatch([{ success: false, shouldContinue: false }]);

		const result = await runSubmissionLifecycle(dispatch, { actions: [], context });

		expect(result).toEqual({
			succeeded: false,
			results: [{ success: false, shouldContinue: false }],
		});
		expect(triggers).toEqual(['form_submit_start', 'form_submit', 'form_submit_error', 'form_submit_complete']);
	});

	test('allows a failed action to continue the submission when requested', async () => {
		const { dispatch, triggers } = createDispatch([{ success: false, shouldContinue: true }]);

		const result = await runSubmissionLifecycle(dispatch, { actions: [], context });

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
			actions: [],
			context: () => contexts[contextIndex++] ?? context,
		});

		expect(dispatchedContexts).toEqual(contexts);
	});
});
