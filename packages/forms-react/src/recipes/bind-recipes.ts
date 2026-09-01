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
} from '@schema-engine/forms/recipes';
import { StepHeader } from '@/components/blocks/step-header';
import { MinimalProgress } from '@/components/blocks/minimal-progress';
import { StepIndicators } from '@/components/blocks/step-indicators';
import { WizardActions } from '@/components/blocks/wizard-actions';
import { CardShell } from '@/components/shells/card-shell';
import { HeroShell } from '@/components/shells/hero-shell';
import { SidebarShell } from '@/components/shells/sidebar-shell';
import { SplitScreenShell } from '@/components/shells/split-screen-shell';
import { StackShell } from '@/components/shells/stack-shell';
import type { ReactRecipeAdapterPayload } from './types';

declare global {
	namespace FormEngine {
		interface RecipeRegistry extends BuiltInRecipeRegistry {}
	}
}

function bind(spec: Parameters<typeof defineFormRecipe>[0], render: ReactRecipeAdapterPayload) {
	return defineFormRecipe(spec, render);
}

export const CardRecipe = bind(cardSpec, {
	shell: CardShell,
	slots: { header: StepHeader },
});
export const SplitScreenRecipe = bind(splitScreenSpec, {
	shell: SplitScreenShell,
	slots: {},
});
export const HeroBackgroundRecipe = bind(heroBackgroundSpec, {
	shell: HeroShell,
	slots: { header: StepHeader },
});
export const BareControlsRecipe = bind(bareControlsSpec, {
	shell: StackShell,
	slots: { actions: WizardActions },
});
export const CardWizardRecipe = bind(cardWizardSpec, {
	shell: CardShell,
	slots: { header: StepHeader, progress: MinimalProgress, actions: WizardActions },
});
export const WizardRecipe = bind(wizardSpec, {
	shell: StackShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
export const SidebarWizardRecipe = bind(sidebarWizardSpec, {
	shell: SidebarShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});
export const HeroWizardRecipe = bind(heroWizardSpec, {
	shell: HeroShell,
	slots: { header: StepHeader, progress: MinimalProgress, actions: WizardActions },
});
export const SplitScreenWizardRecipe = bind(splitScreenWizardSpec, {
	shell: SplitScreenShell,
	slots: { header: StepHeader, progress: StepIndicators, actions: WizardActions },
});

export const builtInRecipes = [
	CardRecipe,
	SplitScreenRecipe,
	HeroBackgroundRecipe,
	BareControlsRecipe,
	CardWizardRecipe,
	WizardRecipe,
	SidebarWizardRecipe,
	HeroWizardRecipe,
	SplitScreenWizardRecipe,
] as const;

export type BuiltInRecipeRegistration = (typeof builtInRecipes)[number];
