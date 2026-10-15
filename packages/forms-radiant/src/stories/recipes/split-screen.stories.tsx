import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const contactForm = FormTemplates.contactForm;

const meta = {
	...recipeStoryMeta({
		description:
			'Single-step `split-screen` recipe — two-column layout with side content and a configurable main form area via `view.shell`.',
	}),
	title: 'Recipes/Split Screen',
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "split-screen"`',
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Welcome back! Sign in to access your account, manage your profile, and pick up where you left off.',
				},
			},
		},
	},
};

export const RightSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Welcome to our platform! Fill out the form to get started.',
					sidePlacement: 'right',
				},
			},
		},
	},
};

export const NarrowSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Quick tip: Complete all required fields marked with an asterisk.',
					sideWidth: 'narrow',
				},
			},
		},
	},
};

export const WideSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Welcome to our comprehensive platform! Here you can manage all aspects of your projects, collaborate with team members, track progress, and much more. Take your time filling out the form.',
					sideWidth: 'wide',
				},
			},
		},
	},
};

export const TopAligned: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Content aligned to the top of the main area',
					contentAlignment: 'top',
				},
			},
		},
	},
};

export const BottomAligned: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Content aligned to the bottom of the main area',
					contentAlignment: 'bottom',
				},
			},
		},
	},
};
