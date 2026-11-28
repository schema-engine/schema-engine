import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms.js';
import { formRendererMeta } from '@/stories/shared/form-story.js';
import { recipeStoryMeta } from './shared/recipe-story.js';

const meta = {
	...recipeStoryMeta({
		description:
			'Single-step `card` recipe — a centered card shell with size and surface via `view.shell.appearance`.',
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
