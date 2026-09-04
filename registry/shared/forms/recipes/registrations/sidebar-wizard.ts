import { defineFormRecipe, sidebarWizardSpec } from '@schema-engine/forms/recipes';
import { StepHeader } from '../blocks/step-header';
import { StepIndicators } from '../blocks/step-indicators';
import { WizardActions } from '../blocks/wizard-actions';
import { SidebarShell } from '../shells/sidebar-shell';

export const SidebarWizardRecipe = defineFormRecipe(sidebarWizardSpec, {
	shell: SidebarShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
