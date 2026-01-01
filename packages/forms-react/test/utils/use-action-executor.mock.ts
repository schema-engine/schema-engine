import { mock } from 'bun:test';
import type {
	FormActionConfig,
	BuilderActionExecutionContext,
	FormActionTrigger,
	ActionExecutionResult,
} from '@schema-engine/forms';

export const mockDispatch = mock(
	(
		_actions: FormActionConfig[],
		_trigger: FormActionTrigger,
		_context: BuilderActionExecutionContext,
		_metadata?: Record<string, unknown>,
	): Promise<ActionExecutionResult[]> => Promise.resolve([{ success: true }]),
);

export const mockDispatchSync = mock(
	(
		actions: FormActionConfig[],
		trigger: FormActionTrigger,
		context: BuilderActionExecutionContext,
		metadata?: Record<string, unknown>,
	): void => {
		void mockDispatch(actions, trigger, context, metadata);
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
