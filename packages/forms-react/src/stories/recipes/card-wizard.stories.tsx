import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { rhfAdapter } from '@/stories/shared/form-builder.ui';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const meta = {
	title: 'Recipes/Card Wizard',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Multi-step `card-wizard` recipe — card shell with progress bar and wizard actions. Configure shell via `view.shell` and progress via `view.progress`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "card-wizard"`',
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
				$type: 'card-wizard',
				shell: { maxWidth: 'md', padding: 'md', shadowSize: 'md' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const WithProgress: Story = {
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

export const LongForm: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Extended Registration Form',
			description: 'A longer multi-step form with more steps',
			view: {
				$type: 'card-wizard',
				shell: { maxWidth: 'md', padding: 'md', shadowSize: 'md' },
				progress: { showPercentage: true },
			},
		},
	},
};
