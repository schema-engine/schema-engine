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
		_metadata?: Record<string, unknown>
	): Promise<ActionExecutionResult[]> => Promise.resolve([{ success: true }])
);

export const mockDispatchSync = mock(
	(
		_actions: FormActionConfig[],
		_trigger: FormActionTrigger,
		_context: BuilderActionExecutionContext,
		_metadata?: Record<string, unknown>
	): void => {
		void mockDispatch(_actions, _trigger, _context, _metadata);
	}
);

export function setupActionExecutorMock() {
	mock.module('@/hooks/use-action-dispatcher', () => ({
		useActionDispatcher: () => ({
			dispatch: mockDispatch,
			dispatchSync: mockDispatchSync,
			getExecutor: () => ({}),
		}),
	}));
}
