import { createContext } from '@ecopages/radiant/context';

import type { StepStates } from '@schema-engine/forms/engine';
import type { FormMeta } from '@/lib/instance-view';
export type { StepStates };

export interface FormInstanceContextValue {
	currentStep: number;
	totalSteps: number;
	/** True when a wizard recipe owns navigation and steps toggle visibility. */
	isWizard: boolean;
	stepStates: StepStates;
	/** Serializable form chrome, so a consumer needs no walk to the instance for its config. */
	meta?: FormMeta;
	goToStep: (index: number) => Promise<void>;
	/** On the last step, validates it and records the result without moving. */
	goToNextStep: () => Promise<void>;
	goToPreviousStep: () => Promise<void>;
	markStepCompleted: (index: number) => void;
	markStepVisited: (index: number) => void;
	isSubmitting: boolean;
}

export const formInstanceContext = createContext<FormInstanceContextValue | undefined>(
	Symbol.for('se-form-instance-context'),
);
