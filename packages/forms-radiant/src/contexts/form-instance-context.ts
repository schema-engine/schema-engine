import { createContext } from '@ecopages/radiant/context';

export interface StepStates {
	completed: boolean[];
	valid: boolean[];
	visited: boolean[];
}

export interface FormInstanceContextValue {
	currentStep: number;
	totalSteps: number;
	stepStates: StepStates;
	goToStep: (index: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	markStepCompleted: (index: number) => void;
	markStepVisited: (index: number) => void;
	isSubmitting: boolean;
}

export const formInstanceContext = createContext<FormInstanceContextValue>(Symbol.for('se-form-instance-context'));
