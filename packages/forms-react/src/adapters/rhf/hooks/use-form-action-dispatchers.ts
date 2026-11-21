import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type { UseFormReturn } from 'react-hook-form';
import type { FormActionTrigger, BuilderActionBaseContext, FormConfigView } from '@schema-engine/forms';
import { buildFormActionContext, checkFormValidity, collectStepActions } from '@schema-engine/forms';
import type { ActionSequenceEntry } from '@schema-engine/actions';
import type { ActionDispatcher, ActionDispatchInput, ActionDispatchResult } from '@schema-engine/forms/actions';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';

interface UseFormActionDispatchersOptions {
	form: UseFormReturn;
	config: FormConfigView;
	registry: ValidationRegistry;
	actionExecutor: ActionDispatcher<BuilderActionBaseContext, FormActionTrigger>;
	getCurrentStep?: () => number;
	/** Seed for elapsed-time metadata; defaults to the form mount. */
	formMountTime?: number;
	onActionResults?: (results: readonly ActionDispatchResult[], trigger: FormActionTrigger) => void | Promise<void>;
}

interface UseFormActionDispatchersReturn {
	buildActionContext: () => BuilderActionBaseContext;
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
 */
export function useFormActionDispatchers({
	form,
	config,
	registry,
	actionExecutor,
	getCurrentStep,
	formMountTime: formMountTimeProp,
	onActionResults,
}: UseFormActionDispatchersOptions): UseFormActionDispatchersReturn {
	const [formMountTime] = useState(() => formMountTimeProp ?? Date.now());

	/**
	 * @remarks
	 * `form.formState` holds the values of the last render, and React Hook Form re-renders the provider only for
	 * the fields something reads. Reading them here would be stale until a context had first been built, so
	 * errors come from `getErrors`, which reads the live state, and touched state and the submit count are
	 * kept from a subscription. Neither subscribes to `isValid`, which would validate the whole form.
	 */
	const liveState = useRef({ touchedFields: form.formState.touchedFields, submitCount: form.formState.submitCount });
	useEffect(
		() =>
			form.subscribe({
				formState: { touchedFields: true, submitCount: true },
				callback: ({ touchedFields, submitCount }) => {
					liveState.current = { touchedFields: touchedFields ?? {}, submitCount: submitCount ?? 0 };
				},
			}),
		[form],
	);

	const formAdapter = useMemo<BuilderActionBaseContext['form']>(
		() => ({
			reset: () => form.reset(),
			setValue: (name, value) => form.setValue(name, value),
			getValue: (name) => form.getValues(name),
			validate: () => form.trigger(),
			checkValidity: () => checkFormValidity({ steps: config.steps, values: form.getValues(), registry }),
		}),
		[form, config.steps, registry],
	);

	const buildActionContext = useCallback((): BuilderActionBaseContext => {
		const { touchedFields, submitCount } = liveState.current;
		return buildFormActionContext({
			config,
			values: form.getValues(),
			formState: { errors: form.getErrors(), touched: touchedFields, submitCount },
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
