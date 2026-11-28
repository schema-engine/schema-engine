import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { FormTemplates } from '@/stories/shared/sample-forms.js';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story.js';

const registrationForm = FormTemplates.registrationForm;

const meta = {
	title: 'Recipes/Split Screen Wizard',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
	},
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Multi-step `split-screen-wizard` recipe — split-screen shell with step indicators. Configure shell via `view.shell` and progress via `view.progress`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: false,
			description: 'Form config with `view.$type: "split-screen-wizard"`',
		},
	},
} satisfies Meta<typeof FormRenderer>;

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
