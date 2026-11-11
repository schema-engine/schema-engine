import { defineRecipe } from '@schema-engine/forms-react/primitives';
import { bareControlsSpec } from '@schema-engine/forms/recipes/built-in';
import { WizardActions } from '../blocks/wizard-actions';
import { StackShell } from '../shells/stack-shell';

export const BareControlsRecipe = defineRecipe(bareControlsSpec, {
	shell: StackShell,
	slots: { actions: WizardActions },
});
