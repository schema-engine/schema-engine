import { defineFormRecipe } from '@schema-engine/forms/recipes';
import { heroBackgroundSpec } from '@schema-engine/forms/recipes/built-in';
import { StepHeader } from '../blocks/step-header';
import { FormActions } from '../blocks/form-actions';
import { HeroShell } from '../shells/hero-shell';

export const HeroBackgroundRecipe = defineFormRecipe(heroBackgroundSpec, {
	shell: HeroShell,
	slots: { header: StepHeader, actions: FormActions },
});
