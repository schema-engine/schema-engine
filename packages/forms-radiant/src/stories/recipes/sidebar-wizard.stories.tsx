import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const meta = {
	...recipeStoryMeta({
		layout: 'padded',
		description:
			'Multi-step `sidebar-wizard` recipe — vertical step navigation in a sidebar. Configure progress via `view.progress`.',
	}),
	title: 'Recipes/Sidebar Wizard',
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "sidebar-wizard"`',
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
				$type: 'sidebar-wizard',
				progress: { orientation: 'sidebar', showStepTitles: true },
			},
		},
	},
};

export const WithoutSeparator: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'sidebar-wizard',
				shell: { showSeparator: false },
				progress: { orientation: 'sidebar', showStepTitles: true },
			},
		},
	},
};
