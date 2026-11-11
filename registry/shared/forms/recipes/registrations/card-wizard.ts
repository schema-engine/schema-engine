import { defineFormRecipe } from '@schema-engine/forms/recipes';
import { cardWizardSpec } from '@schema-engine/forms/recipes/built-in';
import { MinimalProgress } from '../blocks/minimal-progress';
import { StepHeader } from '../blocks/step-header';
import { WizardActions } from '../blocks/wizard-actions';
import { CardShell } from '../shells/card-shell';

export const CardWizardRecipe = defineFormRecipe(cardWizardSpec, {
	shell: CardShell,
	slots: { header: StepHeader, progress: MinimalProgress, actions: WizardActions },
});
