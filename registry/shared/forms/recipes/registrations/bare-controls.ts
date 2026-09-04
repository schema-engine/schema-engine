import { bareControlsSpec, defineFormRecipe } from '@schema-engine/forms/recipes';
import { WizardActions } from '../blocks/wizard-actions';
import { StackShell } from '../shells/stack-shell';

export const BareControlsRecipe = defineFormRecipe(bareControlsSpec, {
	shell: StackShell,
	slots: { actions: WizardActions },
});
