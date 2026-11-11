import { defineRecipeSpec } from './define-recipe-spec';
import {
	CardShellConfigSchema,
	FormActionsConfigSchema,
	HeroShellConfigSchema,
	MinimalProgressConfigSchema,
	SplitScreenShellConfigSchema,
	SidebarShellConfigSchema,
	StepHeaderConfigSchema,
	StepIndicatorsConfigSchema,
	WizardActionsConfigSchema,
} from './slot-schemas';

const MINIMAL_ACTIONS = { appearance: 'minimal', showStepCounter: false } as const;
const CENTERED_HEADER = { align: 'center', size: 'md' } as const;
const HERO_HEADER = { align: 'center', size: 'lg', titleAs: 'h1', inheritColor: true } as const;
const WIZARD_PROGRESS_HEADER = { showStepCounter: true, counterPlacement: 'before' } as const;

export const cardSpec = defineRecipeSpec({
	$type: 'card',
	kind: 'single-step',
	slotSchemas: { shell: CardShellConfigSchema, header: StepHeaderConfigSchema, actions: FormActionsConfigSchema },
	slotDefaults: { header: CENTERED_HEADER },
	metadata: { name: 'Card', description: 'Single-step form in a centered card shell.', category: 'layout' },
});

export const splitScreenSpec = defineRecipeSpec({
	$type: 'split-screen',
	kind: 'single-step',
	slotSchemas: { shell: SplitScreenShellConfigSchema, actions: FormActionsConfigSchema },
	metadata: { name: 'Split screen', description: 'Single-step form with a side panel.', category: 'layout' },
});

export const heroBackgroundSpec = defineRecipeSpec({
	$type: 'hero-background',
	kind: 'single-step',
	slotSchemas: { shell: HeroShellConfigSchema, header: StepHeaderConfigSchema, actions: FormActionsConfigSchema },
	slotDefaults: { header: HERO_HEADER },
	metadata: {
		name: 'Hero background',
		description: 'Single-step form over a hero image or video.',
		category: 'layout',
	},
});

export const bareControlsSpec = defineRecipeSpec({
	$type: 'bare-controls',
	kind: 'wizard',
	slotSchemas: { actions: WizardActionsConfigSchema },
	metadata: {
		name: 'Bare controls',
		description: 'Multi-step form with previous, next, and submit controls only.',
		category: 'wizard',
	},
});

export const cardWizardSpec = defineRecipeSpec({
	$type: 'card-wizard',
	kind: 'wizard',
	slotSchemas: {
		shell: CardShellConfigSchema,
		header: StepHeaderConfigSchema,
		progress: MinimalProgressConfigSchema,
		actions: WizardActionsConfigSchema,
	},
	slotDefaults: { header: { ...CENTERED_HEADER, ...WIZARD_PROGRESS_HEADER }, actions: MINIMAL_ACTIONS },
	metadata: {
		name: 'Card wizard',
		description: 'Multi-step wizard inside a card shell with progress bar.',
		category: 'wizard',
	},
});

export const wizardSpec = defineRecipeSpec({
	$type: 'wizard',
	kind: 'wizard',
	slotSchemas: {
		header: StepHeaderConfigSchema,
		progress: StepIndicatorsConfigSchema,
		actions: WizardActionsConfigSchema,
	},
	metadata: {
		name: 'Wizard',
		description: 'Multi-step wizard with horizontal step indicators.',
		category: 'wizard',
	},
});

export const sidebarWizardSpec = defineRecipeSpec({
	$type: 'sidebar-wizard',
	kind: 'wizard',
	slotSchemas: {
		shell: SidebarShellConfigSchema,
		header: StepHeaderConfigSchema,
		progress: StepIndicatorsConfigSchema,
		actions: WizardActionsConfigSchema,
	},
	slotDefaults: { shell: { showSeparator: true }, header: { size: 'sm' }, progress: { orientation: 'sidebar' } },
	metadata: {
		name: 'Sidebar wizard',
		description: 'Multi-step wizard with step indicators in a sidebar.',
		category: 'wizard',
	},
});

export const heroWizardSpec = defineRecipeSpec({
	$type: 'hero-wizard',
	kind: 'wizard',
	slotSchemas: {
		shell: HeroShellConfigSchema,
		header: StepHeaderConfigSchema,
		progress: MinimalProgressConfigSchema,
		actions: WizardActionsConfigSchema,
	},
	slotDefaults: { header: { ...HERO_HEADER, ...WIZARD_PROGRESS_HEADER }, actions: MINIMAL_ACTIONS },
	metadata: { name: 'Hero wizard', description: 'Multi-step wizard over a hero background.', category: 'wizard' },
});

export const splitScreenWizardSpec = defineRecipeSpec({
	$type: 'split-screen-wizard',
	kind: 'wizard',
	slotSchemas: {
		shell: SplitScreenShellConfigSchema,
		header: StepHeaderConfigSchema,
		progress: StepIndicatorsConfigSchema,
		actions: WizardActionsConfigSchema,
	},
	slotDefaults: { header: { fallbackToFormTitle: false } },
	metadata: {
		name: 'Split screen wizard',
		description: 'Multi-step wizard with a marketing side panel.',
		category: 'wizard',
	},
});

export const builtInRecipeSpecs = {
	card: cardSpec,
	'split-screen': splitScreenSpec,
	'hero-background': heroBackgroundSpec,
	'bare-controls': bareControlsSpec,
	'card-wizard': cardWizardSpec,
	wizard: wizardSpec,
	'sidebar-wizard': sidebarWizardSpec,
	'hero-wizard': heroWizardSpec,
	'split-screen-wizard': splitScreenWizardSpec,
} as const;
