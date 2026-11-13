import { defineRecipe } from '@schema-engine/forms-react/primitives';
import { wizardSpec } from '@schema-engine/forms/recipes/built-in';
import { StepHeader } from '../blocks/step-header';
import { StepIndicators } from '../blocks/step-indicators';
import { WizardActions } from '../blocks/wizard-actions';
import { StackShell } from '../shells/stack-shell';

export const WizardRecipe = defineRecipe(wizardSpec, {
	shell: StackShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
