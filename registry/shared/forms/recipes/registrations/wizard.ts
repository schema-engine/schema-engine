import { defineFormRecipe, wizardSpec } from '@schema-engine/forms/recipes';
import { StepHeader } from '../blocks/step-header';
import { StepIndicators } from '../blocks/step-indicators';
import { WizardActions } from '../blocks/wizard-actions';
import { StackShell } from '../shells/stack-shell';

export const WizardRecipe = defineFormRecipe(wizardSpec, {
	shell: StackShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
