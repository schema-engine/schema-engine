import { createContext } from 'react';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { ActionExecutionResult, FormActionTrigger } from '@schema-engine/forms';
import type { SubmissionState } from '@/hooks/use-submission-state';

/**
 * Form Engine context value
 * It includes the FormEngine instance and action execution function
 */
export interface FormEngineContextValue {
	engine: FormEngine;
	executeAction?: (action: FormActionConfig) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Form Engine context
 * Provides access to the FormEngine instance and action execution function
 */
export const FormEngineContext = createContext<FormEngineContextValue | null>(null);

/**
 * Form Instance context value - includes action execution and form navigation functions
 */
export interface FormInstanceContextValue {
	/** Executes a specific form action */
	executeAction: (action: any) => Promise<any>;
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
	/** State tracking for each step (completion, validity, visitation) */
	stepStates?: {
		completed: boolean[];
		valid: boolean[];
		visited: boolean[];
	};
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
	) => Promise<ActionExecutionResult[]>;
	/** Synchronously dispatches an action trigger event */
	dispatchTriggerSync: (trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => void;
	/** Current lifecycle state of form submission */
	submissionState: SubmissionState;
	/** Resets submission state to 'idle' */
	clearSubmission: () => void;
}

/**
 * Form Instance context
 * Provides access to action execution and form navigation functions
 */
export const FormInstanceContext = createContext<FormInstanceContextValue | null>(null);
