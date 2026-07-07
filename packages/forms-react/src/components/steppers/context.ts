import { createContext, useContext } from 'react';
import type { StepData, StepperFormContext, StepperNavigation } from './types';

export interface StepperContextValue<TConfig = Record<string, unknown>> {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: StepperFormContext;
	config?: TConfig;
}

const StepperContext = createContext<StepperContextValue | null>(null);

export const StepperProvider = StepperContext.Provider;

/**
 * Hook to access stepper context with optional config typing.
 * Provided by StepperRenderer for all registered and fallback steppers.
 */
export function useStepperContext<TConfig = Record<string, unknown>>() {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('useStepperContext must be used within a StepperProvider');
	}
	return context as StepperContextValue<TConfig>;
}
