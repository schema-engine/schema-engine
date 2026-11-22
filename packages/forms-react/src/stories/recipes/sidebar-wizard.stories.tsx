import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const meta = {
	title: 'Recipes/Sidebar Wizard',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Multi-step `sidebar-wizard` recipe — vertical step navigation in a sidebar. Configure progress via `view.progress`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "sidebar-wizard"`',
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
