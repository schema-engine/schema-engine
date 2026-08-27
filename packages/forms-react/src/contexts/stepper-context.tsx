import { createContext, useContext } from 'react';
import type { StepData, StepperFormContext, StepperNavigation } from '@/components/steppers/types';

export interface StepperContextValue<TConfig = Record<string, unknown>> {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: StepperFormContext;
	config: TConfig;
}

const StepperContext = createContext<StepperContextValue | null>(null);

export function StepperProvider<TConfig>({
	children,
	value,
}: {
	children: React.ReactNode;
	value: StepperContextValue<TConfig>;
}) {
	return <StepperContext.Provider value={value as StepperContextValue}>{children}</StepperContext.Provider>;
}

/**
 * Access step data, navigation, and the stepper's own config. Pass the stepper's
 * config type to have `config` typed, e.g. `useStepperContext<MyConfig>()`.
 */
export function useStepperContext<TConfig = Record<string, unknown>>(): StepperContextValue<TConfig> {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('useStepperContext must be used within a StepperProvider');
	}
	return context as StepperContextValue<TConfig>;
}

/**
 * Non-throwing variant for tools that may render outside a stepper tree.
 */
export function useOptionalStepperContext() {
	return useContext(StepperContext);
}
