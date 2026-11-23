import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const meta = {
	title: 'Recipes/Card',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
	},
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Single-step `card` recipe — a centered card shell with size and surface via `view.shell.appearance`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: false,
			description: 'Form config with `view.$type: "card"`',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			view: { $type: 'card' },
		},
	},
};

export const SmallCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			view: {
				$type: 'card',
				shell: { appearance: { size: 'compact', surface: 'outlined' } },
			},
		},
	},
};

export const LargeCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			view: {
				$type: 'card',
				shell: { appearance: { size: 'comfortable', surface: 'elevated' } },
			},
		},
	},
};

export const ExtraLargeCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			view: {
				$type: 'card',
				shell: { appearance: { size: 'comfortable', surface: 'elevated' } },
			},
		},
	},
};
