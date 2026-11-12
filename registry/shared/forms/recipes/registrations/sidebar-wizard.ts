import { defineRecipe } from '@schema-engine/forms-react/primitives';
import { sidebarWizardSpec } from '@schema-engine/forms/recipes/built-in';
import { StepHeader } from '../blocks/step-header';
import { StepIndicators } from '../blocks/step-indicators';
import { WizardActions } from '../blocks/wizard-actions';
import { SidebarShell } from '../shells/sidebar-shell';

export const SidebarWizardRecipe = defineRecipe(sidebarWizardSpec, {
	shell: SidebarShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
