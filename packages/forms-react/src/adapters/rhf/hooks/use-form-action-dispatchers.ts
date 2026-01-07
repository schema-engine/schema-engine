import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger, BuilderActionExecutionContext, ActionExecutionResult } from '@schema-engine/forms';
import type { ActionDispatcher } from '@schema-engine/actions';

type BaseFormContext = Omit<BuilderActionExecutionContext, 'config' | 'trigger'>;

interface UseFormActionDispatchersOptions {
	form: UseFormReturn<any>;
	config: FormConfig;
	actionExecutor: ActionDispatcher;
}

interface UseFormActionDispatchersReturn {
	buildActionContext: () => BaseFormContext;
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
}: UseFormActionDispatchersOptions): UseFormActionDispatchersReturn {
	const buildActionContext = useCallback((): BaseFormContext => {
		const formData = form.getValues();
		const formState = form.formState;

		return {
			formId: config.id || 'unnamed-form',
			formData,
			currentStep: 0,
			totalSteps: config.steps.length,
			isValid: formState.isValid,
			errors: formState.errors,
			form,
			metadata: {
				stepStartTime: Date.now(),
				totalFormTime: Date.now() - Date.now(),
				userInteractions: formState.submitCount + Object.keys(formState.touchedFields).length,
			},
		};
	}, [form, config.id, config.steps.length]);

	const dispatchTrigger = useCallback(
		async (
			trigger: FormActionTrigger,
			extraMetadata?: Record<string, unknown>,
		): Promise<ActionExecutionResult[]> => {
			return actionExecutor.dispatch(config.actions || [], trigger, buildActionContext(), extraMetadata);
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	const dispatchTriggerSync = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => {
			actionExecutor.dispatchSync(config.actions || [], trigger, buildActionContext(), extraMetadata);
		},
		[config.actions, buildActionContext, actionExecutor],
	);

	return {
		buildActionContext,
		dispatchTrigger,
		dispatchTriggerSync,
	};
}
