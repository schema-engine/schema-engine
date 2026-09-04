import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const meta = {
	...recipeStoryMeta({
		layout: 'padded',
		description:
			'Multi-step `wizard` recipe — bare horizontal step indicators with no shell. Configure progress display via `view.progress`.',
	}),
	title: 'Recipes/Wizard',
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "wizard"`',
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: false },
			},
		},
	},
};

export const WithDescriptions: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: true },
			},
		},
	},
};

export const NumbersOnly: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: false, showStepDescriptions: false },
			},
		},
	},
};
