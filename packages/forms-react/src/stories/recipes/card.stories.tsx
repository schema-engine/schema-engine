import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { rhfAdapter } from '@/stories/shared/form-builder.ui';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const meta = {
	title: 'Recipes/Card',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Single-step `card` recipe — a centered card shell with configurable width, padding, and shadow via `view.shell`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
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
				shell: { maxWidth: 'sm', padding: 'sm', shadowSize: 'sm' },
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
				shell: { maxWidth: 'lg', padding: 'lg', shadowSize: 'lg' },
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
				shell: { maxWidth: 'xl', padding: 'lg', shadowSize: 'xl' },
			},
		},
	},
};
