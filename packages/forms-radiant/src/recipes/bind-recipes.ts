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
} from '../components/blocks/index.js';
import { CardShell, HeroShell, SidebarShell, SplitScreenShell, StackShell } from '../components/shells/index.js';
import { defineRecipe } from './define-recipe.js';

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
