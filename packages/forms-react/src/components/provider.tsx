import { createContext } from 'react';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { ActionExecutionResult, FormActionTrigger } from '@schema-engine/forms';

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
	executeAction: (action: any) => Promise<any>;
	handleFormChange: (data: any) => Promise<void>;
	currentStep: number;
	totalSteps: number;
	goToStep: (step: number) => void;
	goToNext: () => void;
	goToPrevious: () => void;
	stepStates?: {
		completed: boolean[];
		valid: boolean[];
		visited: boolean[];
	};
	navigation: {
		canGoNext: boolean;
		canGoPrevious: boolean;
		isFirstStep: boolean;
		isLastStep: boolean;
		goToStep: (step: number) => void;
		goToNextStep: () => void;
		goToPreviousStep: () => void;
	};
	dispatchTrigger: (
		trigger: FormActionTrigger,
		extraMetadata?: Record<string, unknown>,
	) => Promise<ActionExecutionResult[]>;
	dispatchTriggerSync: (trigger: FormActionTrigger, extraMetadata?: Record<string, unknown>) => void;
}

/**
 * Form Instance context
 * Provides access to action execution and form navigation functions
 */
export const FormInstanceContext = createContext<FormInstanceContextValue | null>(null);
