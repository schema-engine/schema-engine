import { useCallback, useMemo, useRef, useState } from 'react';
import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import { ActionDispatcher } from '@schema-engine/forms/actions';
import { collectInitialValues, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { getAppearanceAttributes } from '@schema-engine/layout';
import { collectStepActions, type FormConfigView } from '@schema-engine/forms';
import { getObjectIdentity } from '@/lib/object-identity';
import { FormStateContext, type FormStateContextValue } from '@/hooks/form-state/context';
import { createFieldRegistry } from '@/hooks/form-state/field-registry';
import { createSubmissionStatusStore } from '@/hooks/form-state/submission-status';
import type { FormProviderProps } from '@/hooks/form-state/types';
import { useFormEngine } from '@/hooks/use-form-context';
import { useSubmissionStateManager } from '@/hooks/use-submission-state';
import { FormInstanceContext, type FormInstanceContextValue } from '@/components/provider';
import { FormStepStateContext } from '@/components/form-step-state-context';
import { useFormActionDispatchers } from './form-runtime/use-form-action-dispatchers';
import { useFormChangeEffect } from './form-runtime/use-form-change-effect';
import { useFormMountEffect } from './form-runtime/use-form-mount-effect';
import { useFormSubmitHandler } from './form-runtime/use-form-submit-handler';
import { useMultiStep } from './form-runtime/use-multi-step';

/** @remarks The form instance of one normalized config and one engine: the container is created once, from both. */
function FormInstance<TOutputs extends EngineOutputMaps>({
	config,
	defaultValues,
	children,
	onSubmit,
	onChange,
	onAction,
	onActionResults,
	formatIssue,
}: FormProviderProps<TOutputs>) {
	const { engine, formatIssue: providerFormatIssue } = useFormEngine();
	const runtimeConfig: FormConfigView = config;
	const actionExecutor = useMemo(() => new ActionDispatcher(engine), [engine]);
	const submission = useSubmissionStateManager();

	const [{ container, fields, status }] = useState(() => {
		const elements = flattenStepElements(runtimeConfig.steps);
		return {
			container: createFormStateContainer({
				elements,
				registry: engine.getValidationRegistry(),
				defaults: collectInitialValues(elements, defaultValues),
				validationMode: config.validationMode,
				reValidateMode: config.reValidateMode,
				payload: config.payload,
			}),
			fields: createFieldRegistry(),
			status: createSubmissionStatusStore(),
		};
	});

	const resolvedFormatIssue = formatIssue ?? providerFormatIssue ?? engine.getIssueFormatter();
	const formState = useMemo<FormStateContextValue>(
		() => ({ container, formatIssue: resolvedFormatIssue, fields, status }),
		[container, resolvedFormatIssue, fields, status],
	);

	const currentStepRef = useRef(0);
	const getCurrentStep = useCallback(() => currentStepRef.current, []);

	const actionDispatchers = useFormActionDispatchers({
		container,
		status,
		fetch: engine.fetch,
		config: runtimeConfig,
		actionExecutor,
		getCurrentStep,
		onActionResults,
	});

	const multiStep = useMultiStep(runtimeConfig, { container, fields }, actionDispatchers.dispatchTrigger, {
		onStepIndexChange: (index) => {
			currentStepRef.current = index;
		},
	});

	const mountActions = useMemo(() => collectStepActions(runtimeConfig, 0), [runtimeConfig]);
	useFormMountEffect({
		actions: mountActions,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

	useFormChangeEffect({
		container,
		config: runtimeConfig,
		onChange,
		dispatchTrigger: actionDispatchers.dispatchTrigger,
	});

	const { submitEvent, ...submissionContext } = useFormSubmitHandler({
		container,
		status,
		fields,
		config,
		submission,
		buildActionContext: actionDispatchers.buildActionContext,
		hasMatching: actionDispatchers.hasMatching,
		getCurrentStep,
		onSubmit,
		onAction,
		onActionResults,
		dispatchActions: actionDispatchers.dispatchActions,
	});

	const { stepStates, currentStep, totalSteps, goToStep, goToNext, goToPrevious, navigation } = multiStep;
	const { executeAction, submissionState, clearSubmission } = submissionContext;
	const { buildActionContext, hasMatching, dispatchActions, dispatchTrigger, dispatchTriggerSync } =
		actionDispatchers;
	const formInstanceContextValue: FormInstanceContextValue = useMemo(
		() => ({
			currentStep,
			totalSteps,
			goToStep,
			goToNext,
			goToPrevious,
			navigation,
			buildActionContext,
			hasMatching,
			dispatchActions,
			dispatchTrigger,
			dispatchTriggerSync,
			executeAction,
			submissionState,
			clearSubmission,
		}),
		[
			currentStep,
			totalSteps,
			goToStep,
			goToNext,
			goToPrevious,
			navigation,
			buildActionContext,
			hasMatching,
			dispatchActions,
			dispatchTrigger,
			dispatchTriggerSync,
			executeAction,
			submissionState,
			clearSubmission,
		],
	);

	return (
		<FormStateContext.Provider value={formState}>
			<FormInstanceContext.Provider value={formInstanceContextValue}>
				<FormStepStateContext.Provider value={stepStates}>
					<form
						onSubmit={submitEvent}
						className={runtimeConfig.className}
						style={runtimeConfig.style}
						data-se-theme={engine.getLayout().id}
						{...getAppearanceAttributes(runtimeConfig.appearance)}
						noValidate
					>
						{children}
					</form>
				</FormStepStateContext.Provider>
			</FormInstanceContext.Provider>
		</FormStateContext.Provider>
	);
}

/**
 * Creates the form's state container and renders the `<form>` around its children.
 *
 * @remarks
 * The container is the only form state. It is created from the normalized config, the engine's validation
 * registry, the defaults and the config's `validationMode`, `reValidateMode` and `payload`, and lives as long as
 * the identities of the config and the engine do: a new normalized config or engine starts a fresh instance
 * with its defaults and step state, whichever component renders the provider. `defaultValues` are read when the
 * instance starts. The hooks under the provider read the container with `useSyncExternalStore`.
 *
 * Submission state (`isSubmitting`, `submitCount`) is the provider's own until the form runtime of #336 owns the
 * lifecycle.
 */
export function FormProvider<TOutputs extends EngineOutputMaps = EngineOutputMaps>(props: FormProviderProps<TOutputs>) {
	const { engine } = useFormEngine();
	return <FormInstance key={`${getObjectIdentity(props.config)}:${getObjectIdentity(engine)}`} {...props} />;
}
