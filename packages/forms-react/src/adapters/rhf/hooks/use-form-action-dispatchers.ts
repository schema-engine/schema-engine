import { useCallback, useMemo, useState } from 'react';
import { logger } from '@/lib/logger';
import type { UseFormReturn } from 'react-hook-form';
import type { FormActionTrigger, BuilderActionBaseContext, FormConfigView } from '@schema-engine/forms';
import { buildFormActionContext, collectStepActions } from '@schema-engine/forms';
import type { ActionDispatcher, ActionDispatchInput, ActionDispatchResult } from '@schema-engine/forms/actions';
import type { FormActionConfig } from '@schema-engine/forms/schemas';

interface UseFormActionDispatchersOptions {
	form: UseFormReturn;
	config: FormConfigView;
	actionExecutor: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	getCurrentStep?: () => number;
	/** Seed for elapsed-time metadata; defaults to the form mount. */
	formMountTime?: number;
	onActionResults?: (results: readonly ActionDispatchResult[], trigger: FormActionTrigger) => void | Promise<void>;
}

interface UseFormActionDispatchersReturn {
	buildActionContext: () => BuilderActionBaseContext;
	dispatchActions: (
		input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
		suppressSubmitReport?: boolean,
	) => Promise<ActionDispatchResult[]>;
	dispatchTrigger: (
		trigger: FormActionTrigger,
		extraMetadata?: Record<string, unknown>,
	) => Promise<ActionDispatchResult[]>;
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
	onActionResults,
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

	const buildActionContext = useCallback((): BuilderActionBaseContext => {
		const { isValid, errors, touchedFields, submitCount } = form.formState;
		return buildFormActionContext({
			config,
			values: form.getValues(),
			formState: { isValid, errors, touched: touchedFields, submitCount },
			currentStep: getCurrentStep?.() ?? 0,
			mountedAt: formMountTime,
			form: formAdapter,
		});
	}, [form, config, getCurrentStep, formAdapter, formMountTime]);

	const dispatchActions = useCallback(
		async (
			input: ActionDispatchInput<FormActionConfig, BuilderActionBaseContext, FormActionTrigger>,
			suppressSubmitReport = false,
		): Promise<ActionDispatchResult[]> => {
			const results = await actionExecutor.dispatch(input);
			if (!(suppressSubmitReport && input.trigger === 'form_submit') && results.length) {
				try {
					await onActionResults?.(results, input.trigger);
				} catch (error) {
					logger.error('Action results callback failed:', error);
				}
			}
			return results;
		},
		[actionExecutor, onActionResults],
	);
	const dispatchTrigger = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>): Promise<ActionDispatchResult[]> =>
			dispatchActions({
				actions: collectStepActions(config, getCurrentStep?.() ?? 0),
				trigger,
				context: buildActionContext(),
				metadata: extraMetadata,
			}),
		[config, getCurrentStep, buildActionContext, dispatchActions],
	);
	const dispatchTriggerSync = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => {
			void dispatchTrigger(trigger, extraMetadata).catch((error) => logger.error('dispatchSync failed:', error));
		},
		[dispatchTrigger],
	);

	return {
		buildActionContext,
		dispatchActions,
		dispatchTrigger,
		dispatchTriggerSync,
	};
}
