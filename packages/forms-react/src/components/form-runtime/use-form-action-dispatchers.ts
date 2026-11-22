import { useCallback, useMemo, useState } from 'react';
import { logger } from '@/lib/logger';
import type { FormStateContainer } from '@schema-engine/forms/state-container';
import type { SubmissionStatusStore } from '@/hooks/form-state/submission-status';
import type { FormValues } from '@/hooks/form-state/types';
import type { FormActionTrigger, BuilderActionBaseContext, FormConfigView } from '@schema-engine/forms';
import { buildFormActionContext, collectStepActions } from '@schema-engine/forms';
import type { ActionSequenceEntry } from '@schema-engine/actions';
import type { ActionDispatcher, ActionDispatchInput, ActionDispatchResult } from '@schema-engine/forms/actions';
import type { FormActionConfig } from '@schema-engine/forms/schemas';

interface UseFormActionDispatchersOptions {
	container: FormStateContainer;
	status: SubmissionStatusStore;
	/** The engine's `fetch`, which the context hands to actions. */
	fetch: BuilderActionBaseContext['fetch'];
	config: FormConfigView;
	actionExecutor: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	getCurrentStep?: () => number;
	/** Seed for elapsed-time metadata; defaults to the form mount. */
	formMountTime?: number;
	onActionResults?: (results: readonly ActionDispatchResult[], trigger: FormActionTrigger) => void | Promise<void>;
}

interface UseFormActionDispatchersReturn {
	/**
	 * Builds the context of a trigger.
	 *
	 * @remarks `values` are the form data it carries: a submission passes the values it validated, and a trigger outside one reads the container's current values.
	 */
	buildActionContext: (values?: FormValues) => BuilderActionBaseContext;
	/** Whether any of the actions answers the trigger. */
	hasMatching: (actions: readonly ActionSequenceEntry<FormActionConfig>[], trigger: FormActionTrigger) => boolean;
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
 *
 * @remarks
 * A context reads the container's current snapshot and builds no validation: `isValid` reports the errors
 * recorded, and an action that needs fresh validity asks `context.form.checkValidity()`.
 */
export function useFormActionDispatchers({
	container,
	status,
	fetch,
	config,
	actionExecutor,
	getCurrentStep,
	formMountTime: formMountTimeProp,
	onActionResults,
}: UseFormActionDispatchersOptions): UseFormActionDispatchersReturn {
	const [formMountTime] = useState(() => formMountTimeProp ?? Date.now());

	const formAdapter = useMemo<BuilderActionBaseContext['form']>(
		() => ({
			reset: () => {
				container.reset();
				status.clear();
			},
			setValue: (name, value) => container.setValue(name, value),
			getValue: (name) => container.getValue(name),
			validate: () => container.validate(),
			checkValidity: () => container.checkValidity(),
		}),
		[container, status],
	);

	const buildActionContext = useCallback(
		(submitted?: FormValues): BuilderActionBaseContext => {
			const { values, errors, touched, isValid } = container.getSnapshot();
			return buildFormActionContext({
				config,
				values: submitted ?? values,
				formState: { isValid, errors, touched, submitCount: status.getSnapshot().submitCount },
				currentStep: getCurrentStep?.() ?? 0,
				mountedAt: formMountTime,
				form: formAdapter,
				fetch,
			});
		},
		[container, status, config, getCurrentStep, formAdapter, formMountTime, fetch],
	);

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
		async (
			trigger: FormActionTrigger,
			extraMetadata?: Record<string, unknown>,
		): Promise<ActionDispatchResult[]> => {
			const actions = collectStepActions(config, getCurrentStep?.() ?? 0);
			if (!actionExecutor.hasMatching(actions, trigger)) return [];
			return dispatchActions({ actions, trigger, context: buildActionContext(), metadata: extraMetadata });
		},
		[config, getCurrentStep, actionExecutor, buildActionContext, dispatchActions],
	);
	const dispatchTriggerSync = useCallback(
		(trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => {
			void dispatchTrigger(trigger, extraMetadata).catch((error) => logger.error('dispatchSync failed:', error));
		},
		[dispatchTrigger],
	);

	const hasMatching = useCallback(
		(actions: readonly ActionSequenceEntry<FormActionConfig>[], trigger: FormActionTrigger) =>
			actionExecutor.hasMatching(actions, trigger),
		[actionExecutor],
	);

	return {
		buildActionContext,
		hasMatching,
		dispatchActions,
		dispatchTrigger,
		dispatchTriggerSync,
	};
}
