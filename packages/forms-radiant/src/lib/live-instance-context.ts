import type { FormInstanceContextValue } from '@/contexts/form-instance-context';
import type { FormInstanceElement } from '@/components/form-instance.script';

/**
 * @remarks SSR children construct before host props are applied. Getters read
 * the current host snapshot until live context updates replace this facade.
 */
export function createLiveInstanceContext(host: FormInstanceElement): FormInstanceContextValue {
	return {
		get currentStep() {
			return host.currentStep;
		},
		get totalSteps() {
			return host.getContextValue().totalSteps;
		},
		get isWizard() {
			return host.getContextValue().isWizard;
		},
		get stepStates() {
			return host.stepStates;
		},
		get isSubmitting() {
			return host.isSubmitting;
		},
		goToStep: host.goToStep,
		goToNextStep: host.goToNextStep,
		goToPreviousStep: host.goToPreviousStep,
		markStepCompleted: host.markStepCompleted,
		markStepVisited: host.markStepVisited,
	};
}
