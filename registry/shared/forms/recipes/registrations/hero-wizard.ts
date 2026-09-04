import { defineFormRecipe, heroWizardSpec } from '@schema-engine/forms/recipes';
import { MinimalProgress } from '../blocks/minimal-progress';
import { StepHeader } from '../blocks/step-header';
import { WizardActions } from '../blocks/wizard-actions';
import { HeroShell } from '../shells/hero-shell';

export const HeroWizardRecipe = defineFormRecipe(heroWizardSpec, {
	shell: HeroShell,
	slots: { header: StepHeader, progress: MinimalProgress, actions: WizardActions },
});
