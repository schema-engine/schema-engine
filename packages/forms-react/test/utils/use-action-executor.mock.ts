import { vi } from 'vitest';
import type {
	BuilderActionBaseContext,
	FormActionConfig,
	FormActionTrigger,
	ActionExecutionResult,
} from '@schema-engine/forms';
import type { ActionDispatchInput } from '@schema-engine/actions';

export const mockDispatch = vi.fn(
	(
		_input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
	): Promise<ActionExecutionResult[]> => Promise.resolve([{ success: true }]),
);

export const mockDispatchSync = vi.fn(
	(input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>): void => {
		void mockDispatch(input);
	},
);
