import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const meta = {
	title: 'Recipes/Wizard',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Multi-step `wizard` recipe — bare horizontal step indicators with no shell. Configure progress display via `view.progress`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "wizard"`',
		},
	},
} satisfies Meta<typeof FormRenderer>;

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
