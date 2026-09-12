import { defineFormRecipe, heroBackgroundSpec } from '@schema-engine/forms/recipes';
import { StepHeader } from '../blocks/step-header';
import { FormActions } from '../blocks/form-actions';
import { HeroShell } from '../shells/hero-shell';

export const HeroBackgroundRecipe = defineFormRecipe(heroBackgroundSpec, {
	shell: HeroShell,
	slots: { header: StepHeader, actions: FormActions },
});
