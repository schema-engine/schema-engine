import { defineFormRecipe, type RecipeSlotSchemas, type RecipeSpec } from '@schema-engine/forms/recipes';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
	bareControlsSpec,
	cardSpec,
	cardWizardSpec,
	heroBackgroundSpec,
	heroWizardSpec,
	sidebarWizardSpec,
	splitScreenSpec,
	splitScreenWizardSpec,
	wizardSpec,
} from '@schema-engine/forms/recipes/built-in';
import {
	StepHeaderBlock,
	MinimalProgressBlock,
	StepIndicatorsBlock,
	WizardActionsBlock,
	FormActionsBlock,
} from '@/components/blocks/index.js';
import { CardShell, HeroShell, SidebarShell, SplitScreenShell, StackShell } from '@/components/shells/index.js';
import type { RadiantRecipePayload } from './types.js';

/**
 * Binds a recipe spec to Radiant components, requiring exactly the slots the spec declares.
 */
export function defineRecipe<
	const TType extends string,
	TSlots extends RecipeSlotSchemas,
	TSchema extends StandardSchemaV1,
>(spec: RecipeSpec<TType, TSchema, TSlots>, payload: RadiantRecipePayload<TSlots>) {
	return defineFormRecipe(spec, payload);
}

export const CardRecipe = defineRecipe(cardSpec, {
	shell: CardShell,
	slots: { header: StepHeaderBlock, actions: FormActionsBlock },
});
export const SplitScreenRecipe = defineRecipe(splitScreenSpec, {
	shell: SplitScreenShell,
	slots: { actions: FormActionsBlock },
});
export const HeroBackgroundRecipe = defineRecipe(heroBackgroundSpec, {
	shell: HeroShell,
	slots: { header: StepHeaderBlock, actions: FormActionsBlock },
});
export const BareControlsRecipe = defineRecipe(bareControlsSpec, {
	shell: StackShell,
	slots: { actions: WizardActionsBlock },
});
export const WizardRecipe = defineRecipe(wizardSpec, {
	shell: StackShell,
	slots: { header: StepHeaderBlock, progress: StepIndicatorsBlock, actions: WizardActionsBlock },
});
export const SidebarWizardRecipe = defineRecipe(sidebarWizardSpec, {
	shell: SidebarShell,
	slots: { header: StepHeaderBlock, progress: StepIndicatorsBlock, actions: WizardActionsBlock },
});
export const CardWizardRecipe = defineRecipe(cardWizardSpec, {
	shell: CardShell,
	slots: { header: StepHeaderBlock, progress: MinimalProgressBlock, actions: WizardActionsBlock },
});
export const HeroWizardRecipe = defineRecipe(heroWizardSpec, {
	shell: HeroShell,
	slots: { header: StepHeaderBlock, progress: MinimalProgressBlock, actions: WizardActionsBlock },
});
export const SplitScreenWizardRecipe = defineRecipe(splitScreenWizardSpec, {
	shell: SplitScreenShell,
	slots: { header: StepHeaderBlock, progress: StepIndicatorsBlock, actions: WizardActionsBlock },
});

export const radiantRecipes = [
	CardRecipe,
	SplitScreenRecipe,
	HeroBackgroundRecipe,
	BareControlsRecipe,
	WizardRecipe,
	SidebarWizardRecipe,
	CardWizardRecipe,
	HeroWizardRecipe,
	SplitScreenWizardRecipe,
] as const;
