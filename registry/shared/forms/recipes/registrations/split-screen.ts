import { defineRecipe } from '@schema-engine/forms-react/primitives';
import { splitScreenSpec } from '@schema-engine/forms/recipes/built-in';
import { FormActions } from '../blocks/form-actions';
import { SplitScreenShell } from '../shells/split-screen-shell';

export const SplitScreenRecipe = defineRecipe(splitScreenSpec, {
	shell: SplitScreenShell,
	slots: { actions: FormActions },
});
