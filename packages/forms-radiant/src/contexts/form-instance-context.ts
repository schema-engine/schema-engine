import { createContext } from '@ecopages/radiant/context';

import type { StepStates } from '@schema-engine/forms/engine';
export type { StepStates };

export interface FormInstanceContextValue {
	currentStep: number;
	totalSteps: number;
	/** True when a wizard recipe owns navigation and steps toggle visibility. */
	isWizard: boolean;
	stepStates: StepStates;
	goToStep: (index: number) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	markStepCompleted: (index: number) => void;
	markStepVisited: (index: number) => void;
	isSubmitting: boolean;
}

export const formInstanceContext = createContext<FormInstanceContextValue>(Symbol.for('se-form-instance-context'));
