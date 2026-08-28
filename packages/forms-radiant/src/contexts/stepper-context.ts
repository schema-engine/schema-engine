import { createContext } from '@ecopages/radiant/context';
import type { StepData, StepperFormContext, StepperNavigation } from '@/components/steppers/types';

export interface StepperContextValue<TConfig = Record<string, unknown>> {
	steps: StepData[];
	currentStepIndex: number;
	navigation: StepperNavigation;
	form: StepperFormContext;
	config: TConfig;
}

export const stepperContext = createContext<StepperContextValue>(Symbol.for('se-stepper-context'));
