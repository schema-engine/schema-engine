import { mock } from 'bun:test';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger, ActionExecutionResult, ActionExecutionContext } from '@schema-engine/forms';

export const mockExecuteTrigger = mock((
	_actions: FormActionConfig[],
	_trigger: FormActionTrigger,
	_context: ActionExecutionContext,
	_triggeredBy?: FormActionConfig,
): Promise<ActionExecutionResult[]> => Promise.resolve([{ success: true }]));

export const mockDispatchTrigger = mock((
	_actions: FormActionConfig[],
	_trigger: FormActionTrigger,
	_context: ActionExecutionContext,
	_extraMetadata?: Record<string, unknown>,
): Promise<ActionExecutionResult[]> => 
	mockExecuteTrigger(_actions, _trigger, _context)
);

export const mockDispatchTriggerSync = mock((
	_actions: FormActionConfig[],
	_trigger: FormActionTrigger,
	_context: ActionExecutionContext,
	_extraMetadata?: Record<string, unknown>,
): void => {
	void mockDispatchTrigger(_actions, _trigger, _context, _extraMetadata);
});

export function setupActionExecutorMock() {
	mock.module('@/hooks/use-action-executor', () => ({
		useActionExecutor: () => ({ 
			executeTrigger: mockExecuteTrigger,
			dispatchTrigger: mockDispatchTrigger,
			dispatchTriggerSync: mockDispatchTriggerSync,
		}),
	}));
}
