import { mock } from 'bun:test';
import type {
	BuilderActionBaseContext,
	FormActionConfig,
	FormActionTrigger,
	ActionExecutionResult,
} from '@schema-engine/forms';
import type { ActionDispatchInput } from '@schema-engine/actions';

export const mockDispatch = mock(
	(
		_input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
	): Promise<ActionExecutionResult[]> => Promise.resolve([{ success: true }]),
);

export const mockDispatchSync = mock(
	(input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>): void => {
		void mockDispatch(input);
	},
);

/**
 * Replace the ActionDispatcher runtime used by FormProvider with a test double.
 */
export function setupActionExecutorMock() {
	void mock.module('@schema-engine/actions', () => {
		return {
			ActionDispatcher: class {
				dispatch = mockDispatch;
				dispatchSync = mockDispatchSync;
			},
		};
	});
}
