import { createContext } from '@ecopages/radiant/context';

import type { StepStates } from '@schema-engine/forms/engine';
import type { FormIssueFormatter, FormStateContainer } from '@schema-engine/forms/state-container';
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
	/** Submission attempts that reached a verdict, a failed validation included, since the form was created or reset. */
	submitCount: number;
	/**
	 * The form's state container: values, field state, row ids and validation.
	 *
	 * @remarks
	 * Absent until the instance has a config, an engine and its `rui-form`, and on the server. A new container
	 * replaces it when the config or the engine changes, so a consumer reads it from this context rather than
	 * keeping it.
	 */
	container: FormStateContainer | undefined;
	/** Turns an issue into text; the application's i18n layer, given to the renderer. */
	formatIssue: FormIssueFormatter | undefined;
}

export const formInstanceContext = createContext<FormInstanceContextValue | undefined>(
	Symbol.for('se-form-instance-context'),
);
