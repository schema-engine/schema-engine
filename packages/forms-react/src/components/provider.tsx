import { createContext } from 'react';
import type { EngineOutputMaps, FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormActionTrigger } from '@schema-engine/forms';
import type { ActionDispatchResult } from '@schema-engine/forms/actions';

/**
 * Form Engine context value
 */
export interface FormEngineContextValue<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	engine: FormEngine<TElements, TRecipes, TActions, TOutputs>;
}

/**
 * Erases registration maps for context storage.
 *
 * @remarks `useFormEngine` reapplies the consumer's maps after reading context.
 */
export function createFormEngineContextValue<
	TElements extends Record<string, unknown>,
	TRecipes extends Record<string, unknown>,
	TActions extends Record<string, unknown>,
	TOutputs extends EngineOutputMaps,
>(engine: FormEngine<TElements, TRecipes, TActions, TOutputs>): FormEngineContextValue {
	return { engine: engine as unknown as FormEngineContextValue['engine'] };
}

/**
 * Form Engine context
 * Provides access to the FormEngine instance
 */
export const FormEngineContext = createContext<FormEngineContextValue | null>(null);

/**
 * Form Instance context value - includes trigger dispatch and form navigation functions
 */
export interface FormInstanceContextValue {
	/** Index of the current step (0-based) */
	currentStep: number;
	/** Total number of steps in the form */
	totalSteps: number;
	/** Navigates to a specific step index */
	goToStep: (step: number) => void;
	/** Navigates to the next step if allowed */
	goToNext: () => void;
	/** Navigates to the previous step if allowed */
	goToPrevious: () => void;
	/** Comprehensive navigation controls and strict state checks */
	navigation: {
		/** Whether navigation to next step is currently allowed */
		canGoNext: boolean;
		/** Whether navigation to previous step is currently allowed */
		canGoPrevious: boolean;
		/** Whether currently on the first step */
		isFirstStep: boolean;
		/** Whether currently on the last step */
		isLastStep: boolean;
		/** Go to specific step index */
		goToStep: (step: number) => void;
		/** Go to next step */
		goToNextStep: () => void;
		/** Go to previous step */
		goToPreviousStep: () => void;
	};
	/** Dispatches an action trigger event through the engine */
	dispatchTrigger: (
		trigger: FormActionTrigger,
		extraMetadata?: Record<string, unknown>,
	) => Promise<ActionDispatchResult[]>;
	/** Synchronously dispatches an action trigger event */
	dispatchTriggerSync: (trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => void;
}

/**
 * Form Instance context
 * Provides access to trigger dispatch and form navigation functions
 */
export const FormInstanceContext = createContext<FormInstanceContextValue | null>(null);
