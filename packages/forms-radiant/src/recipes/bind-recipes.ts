import {
	bareControlsSpec,
	cardSpec,
	cardWizardSpec,
	defineFormRecipe,
	heroBackgroundSpec,
	heroWizardSpec,
	sidebarWizardSpec,
	splitScreenSpec,
	splitScreenWizardSpec,
	wizardSpec,
	type BuiltInRecipeRegistry,
	type RecipeSpec,
} from '@schema-engine/forms/recipes';
import {
	StepHeaderBlock,
	MinimalProgressBlock,
	StepIndicatorsBlock,
	WizardActionsBlock,
	FormActionsBlock,
} from '@/components/blocks';
import { CardShell, HeroShell, SidebarShell, SplitScreenShell, StackShell } from '@/components/shells';
import type { RadiantRecipeAdapterPayload } from './types';

declare global {
	namespace FormEngine {
		interface RecipeRegistry extends BuiltInRecipeRegistry {}
	}
}

function bind<TSpec extends RecipeSpec>(spec: TSpec, render: RadiantRecipeAdapterPayload) {
	return defineFormRecipe(spec, render);
}

export const CardRecipe = bind(cardSpec, {
	shell: CardShell,
	slots: { header: StepHeaderBlock, actions: FormActionsBlock },
});
export const SplitScreenRecipe = bind(splitScreenSpec, {
	shell: SplitScreenShell,
	slots: { actions: FormActionsBlock },
});
export const HeroBackgroundRecipe = bind(heroBackgroundSpec, {
	shell: HeroShell,
	slots: { header: StepHeaderBlock, actions: FormActionsBlock },
});
export const BareControlsRecipe = bind(bareControlsSpec, {
	shell: StackShell,
	slots: { actions: WizardActionsBlock },
});
export const WizardRecipe = bind(wizardSpec, {
	shell: StackShell,
	slots: { header: StepHeaderBlock, progress: StepIndicatorsBlock, actions: WizardActionsBlock },
});
export const SidebarWizardRecipe = bind(sidebarWizardSpec, {
	shell: SidebarShell,
	slots: { header: StepHeaderBlock, progress: StepIndicatorsBlock, actions: WizardActionsBlock },
});
export const CardWizardRecipe = bind(cardWizardSpec, {
	shell: CardShell,
	slots: { header: StepHeaderBlock, progress: MinimalProgressBlock, actions: WizardActionsBlock },
});
export const HeroWizardRecipe = bind(heroWizardSpec, {
	shell: HeroShell,
	slots: { header: StepHeaderBlock, progress: MinimalProgressBlock, actions: WizardActionsBlock },
});
export const SplitScreenWizardRecipe = bind(splitScreenWizardSpec, {
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
