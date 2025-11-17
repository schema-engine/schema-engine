import { createContext, useContext } from 'react';
import type { BaseStepperProps } from './types';

export interface StepperContextValue<TConfig = Record<string, unknown>> extends Omit<BaseStepperProps, 'config'> {
	config?: TConfig;
}

const StepperContext = createContext<StepperContextValue<any> | null>(null);

/**
 * Hook to access stepper context with proper typing
 * @template TConfig - The stepper configuration type
 */
export function useStepperContext<TConfig = Record<string, unknown>>() {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('Stepper compound components must be used within a Stepper component');
	}
	return context as StepperContextValue<TConfig>;
}

export const StepperProvider = StepperContext.Provider;
