import { useCallback, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger, BuilderActionBaseContext, ActionExecutionResult } from '@schema-engine/forms';
import type { ActionDispatcher } from '@schema-engine/actions';

interface UseFormActionDispatchersOptions {
	form: UseFormReturn<any>;
	config: FormConfig;
	actionExecutor: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	getCurrentStep?: () => number;
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
	const formMountTimeRef = useRef(formMountTimeProp ?? Date.now());

	const buildActionContext = useCallback((): BuilderActionBaseContext => {
		const formData = form.getValues();
		const formState = form.formState;

		return {
			formId: config.id || 'unnamed-form',
			formData,
			currentStep: getCurrentStep?.() ?? 0,
			totalSteps: config.steps.length,
			isValid: formState.isValid,
			errors: formState.errors,
			form,
			metadata: {
				stepStartTime: Date.now(),
				totalFormTime: Date.now() - formMountTimeRef.current,
				userInteractions: formState.submitCount + Object.keys(formState.touchedFields).length,
			},
		};
	}, [form, config.id, config.steps.length, getCurrentStep]);

	const dispatchTrigger = useCallback(
		async (
			trigger: FormActionTrigger,
			extraMetadata?: Record<string, unknown>,
		): Promise<ActionExecutionResult[]> => {
			return actionExecutor.dispatch({
				actions: config.actions || [],
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
				actions: config.actions || [],
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
