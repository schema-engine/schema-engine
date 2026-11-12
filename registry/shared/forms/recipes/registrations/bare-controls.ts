import { defineFormRecipe } from '@schema-engine/forms/recipes';
import { bareControlsSpec } from '@schema-engine/forms/recipes/built-in';
import { WizardActions } from '../blocks/wizard-actions';
import { StackShell } from '../shells/stack-shell';

export const BareControlsRecipe = defineFormRecipe(bareControlsSpec, {
	shell: StackShell,
	slots: { actions: WizardActions },
});
