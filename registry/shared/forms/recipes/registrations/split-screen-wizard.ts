import { defineFormRecipe, splitScreenWizardSpec } from '@schema-engine/forms/recipes';
import { StepHeader } from '../blocks/step-header';
import { StepIndicators } from '../blocks/step-indicators';
import { WizardActions } from '../blocks/wizard-actions';
import { SplitScreenShell } from '../shells/split-screen-shell';

export const SplitScreenWizardRecipe = defineFormRecipe(splitScreenWizardSpec, {
	shell: SplitScreenShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
