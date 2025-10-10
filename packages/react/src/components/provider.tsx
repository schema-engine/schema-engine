import { createContext } from 'react';
import type { FormFieldComponentRegistry } from '@json-form-engine/core/schemas/registry';
import type { FormActionConfig } from '@json-form-engine/core/schemas';

/**
 * Form Engine context value
 * It includes the component registry and action execution function
 */
export interface FormEngineContextValue {
	registry: FormFieldComponentRegistry;
	executeAction?: (action: FormActionConfig) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Form Engine context
 * Provides access to the component registry and action execution function
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
}

/**
 * Form Instance context
 * Provides access to action execution and form navigation functions
 */
export const FormInstanceContext = createContext<FormInstanceContextValue | null>(null);
