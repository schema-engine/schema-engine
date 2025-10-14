import { createContext, useContext } from 'react';
import type { StepData, StepperNavigation } from '@/components/steppers/types';

interface StepperContextValue {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: {
		id: string;
		title?: string;
		description?: string;
		isSubmitting?: boolean;
	};
	config: Record<string, any>;
}

const StepperContext = createContext<StepperContextValue | null>(null);

export function StepperProvider({ children, value }: { children: React.ReactNode; value: StepperContextValue }) {
	return <StepperContext.Provider value={value}>{children}</StepperContext.Provider>;
}

/**
 * Hook to access stepper context data
 * Use this in custom stepper components to access step information and navigation
 */
export function useStepperContext() {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('useStepperContext must be used within a StepperProvider');
	}
	return context;
}
