import { defineRecipe } from '@schema-engine/forms-react/primitives';
import { heroBackgroundSpec } from '@schema-engine/forms/recipes/built-in';
import { StepHeader } from '../blocks/step-header';
import { FormActions } from '../blocks/form-actions';
import { HeroShell } from '../shells/hero-shell';

export const HeroBackgroundRecipe = defineRecipe(heroBackgroundSpec, {
	shell: HeroShell,
	slots: { header: StepHeader, actions: FormActions },
});
