import { defineFormRecipe } from '@schema-engine/forms/recipes';
import { cardSpec } from '@schema-engine/forms/recipes/built-in';
import { StepHeader } from '../blocks/step-header';
import { FormActions } from '../blocks/form-actions';
import { CardShell } from '../shells/card-shell';

export const CardRecipe = defineFormRecipe(cardSpec, {
	shell: CardShell,
	slots: { header: StepHeader, actions: FormActions },
});
