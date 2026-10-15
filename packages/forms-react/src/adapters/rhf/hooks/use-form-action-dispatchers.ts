import { useCallback, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
	FormActionTrigger,
	BuilderActionBaseContext,
	ActionExecutionResult,
	FormConfigView,
} from '@schema-engine/forms';
import { buildFormActionContext } from '@schema-engine/forms';
import type { ActionDispatcher } from '@schema-engine/forms/actions';

interface UseFormActionDispatchersOptions {
	form: UseFormReturn;
	config: FormConfigView;
	actionExecutor: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	getCurrentStep?: () => number;
	/** Seed for elapsed-time metadata; defaults to the form mount. */
	formMountTime?: number;
}

interface UseFormActionDispatchersReturn {
	buildActionContext: () => BuilderActionBaseContext;
	dispatchTrigger: (
		trigger: FormActionTrigger,
		extraMetadata?: Record<string, unknown>,
	) => Promise<ActionExecutionResult[]>;
	dispatchTriggerSync: (trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => void;
}

/**
 * Provides action context building and trigger dispatching capabilities.
 * Encapsulates the logic for creating execution context and dispatching form actions.
 */
export function useFormActionDispatchers({
	form,
	config,
	actionExecutor,
	getCurrentStep,
	formMountTime: formMountTimeProp,
}: UseFormActionDispatchersOptions): UseFormActionDispatchersReturn {
	const [formMountTime] = useState(() => formMountTimeProp ?? Date.now());

	const formAdapter = useMemo<BuilderActionBaseContext['form']>(
		() => ({
			reset: () => form.reset(),
			setValue: (name, value) => form.setValue(name, value),
			getValue: (name) => form.getValues(name),
			validate: () => form.trigger(),
		}),
		[form],
	);

	const buildActionContext = useCallback(
		(): BuilderActionBaseContext =>
			buildFormActionContext({
				config,
				values: form.getValues(),
				formState: form.formState,
				currentStep: getCurrentStep?.() ?? 0,
				mountedAt: formMountTime,
				form: formAdapter,
			}),
		[form, config, getCurrentStep, formAdapter, formMountTime],
	);

	const dispatchTrigger = useCallback(
		async (
			trigger: FormActionTrigger,
			extraMetadata?: Record<string, unknown>,
		): Promise<ActionExecutionResult[]> => {
			return actionExecutor.dispatch({
				actions: config.actions ?? [],
				trigger,
				context: buildActionContext(),
				metadata: extraMetadata,
			});
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	const dispatchTriggerSync = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => {
			actionExecutor.dispatchSync({
				actions: config.actions ?? [],
				trigger,
				context: buildActionContext(),
				metadata: extraMetadata,
			});
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	return {
		buildActionContext,
		dispatchTrigger,
		dispatchTriggerSync,
	};
}
