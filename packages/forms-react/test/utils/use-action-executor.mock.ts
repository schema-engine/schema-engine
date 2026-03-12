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

export function setupActionExecutorMock() {
	void mock.module('@/hooks/use-action-dispatcher', () => ({
		useActionDispatcher: () => ({
			dispatch: mockDispatch,
			dispatchSync: mockDispatchSync,
		}),
	}));
}
