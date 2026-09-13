import { defineFormRecipe, splitScreenSpec } from '@schema-engine/forms/recipes';
import { FormActions } from '../blocks/form-actions';
import { SplitScreenShell } from '../shells/split-screen-shell';

export const SplitScreenRecipe = defineFormRecipe(splitScreenSpec, {
	shell: SplitScreenShell,
	slots: { actions: FormActions },
});
