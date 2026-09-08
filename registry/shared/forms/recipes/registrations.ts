/**
 * Generated registration barrel for the default recipe registry item.
 * Consumers explicitly opt into this visual layer with createFormEngine({ recipes: [...] }).
 */
import { BareControlsRecipe } from './registrations/bare-controls';
import { CardRecipe } from './registrations/card';
import { CardWizardRecipe } from './registrations/card-wizard';
import { HeroBackgroundRecipe } from './registrations/hero-background';
import { HeroWizardRecipe } from './registrations/hero-wizard';
import { SidebarWizardRecipe } from './registrations/sidebar-wizard';
import { SplitScreenRecipe } from './registrations/split-screen';
import { SplitScreenWizardRecipe } from './registrations/split-screen-wizard';
import { WizardRecipe } from './registrations/wizard';

export type { BuiltInRecipeRegistry } from './recipe-registry';

export {
	BareControlsRecipe,
	CardRecipe,
	CardWizardRecipe,
	HeroBackgroundRecipe,
	HeroWizardRecipe,
	SidebarWizardRecipe,
	SplitScreenRecipe,
	SplitScreenWizardRecipe,
	WizardRecipe,
};

export const schemaFormRecipeRegistrations = [
	BareControlsRecipe,
	CardRecipe,
	CardWizardRecipe,
	HeroBackgroundRecipe,
	HeroWizardRecipe,
	SidebarWizardRecipe,
	SplitScreenRecipe,
	SplitScreenWizardRecipe,
	WizardRecipe,
] as const;
