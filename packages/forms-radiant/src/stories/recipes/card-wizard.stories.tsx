import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const meta = {
	...recipeStoryMeta({
		layout: 'padded',
		description:
			'Multi-step `card-wizard` recipe — card shell with progress bar and wizard actions. Configure shell via `view.shell` and progress via `view.progress`.',
	}),
	title: 'Recipes/Card Wizard',
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "card-wizard"`',
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
				$type: 'card-wizard',
				shell: { maxWidth: 'md', padding: 'md', shadowSize: 'md' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const WithoutProgress: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'card-wizard',
				shell: { maxWidth: 'md', padding: 'md', shadowSize: 'md' },
				progress: { showPercentage: false },
			},
		},
	},
};
