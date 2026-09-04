import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const registrationForm = FormTemplates.registrationForm;

const meta = {
	...recipeStoryMeta({
		description:
			'Multi-step `split-screen-wizard` recipe — split-screen shell with step indicators. Configure shell via `view.shell` and progress via `view.progress`.',
	}),
	title: 'Recipes/Split Screen Wizard',
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...registrationForm,
			view: {
				$type: 'split-screen-wizard',
				shell: {
					sideContent: 'Welcome to our platform. Complete each step to set up your account.',
					sidePlacement: 'left',
					sideWidth: 'normal',
				},
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: false },
			},
		},
	},
};

export const RightSide: Story = {
	args: {
		config: {
			...registrationForm,
			view: {
				$type: 'split-screen-wizard',
				shell: {
					sideContent: 'Step-by-step setup guide. Your progress will be saved automatically.',
					sidePlacement: 'right',
					sideWidth: 'normal',
				},
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: false },
			},
		},
	},
};

export const WidePanel: Story = {
	args: {
		config: {
			...registrationForm,
			view: {
				$type: 'split-screen-wizard',
				shell: {
					sideContent:
						'Comprehensive onboarding process. Take your time to fill out each section carefully. Your information is secure and will be used to personalize your experience.',
					sidePlacement: 'left',
					sideWidth: 'wide',
				},
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: false },
			},
		},
	},
};

export const NarrowPanel: Story = {
	args: {
		config: {
			...registrationForm,
			view: {
				$type: 'split-screen-wizard',
				shell: {
					sideContent: 'Quick Setup',
					sidePlacement: 'left',
					sideWidth: 'narrow',
				},
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: false },
			},
		},
	},
};
