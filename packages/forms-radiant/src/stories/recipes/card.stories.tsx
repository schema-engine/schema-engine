import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const meta = {
	...recipeStoryMeta({
		description:
			'Single-step `card` recipe — a centered card shell with configurable width, padding, and shadow via `view.shell`.',
	}),
	title: 'Recipes/Card',
} satisfies Meta<typeof formRendererMeta.component>;

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
