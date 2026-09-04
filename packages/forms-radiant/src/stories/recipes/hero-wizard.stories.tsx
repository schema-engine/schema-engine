import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const gradientImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';

const meta = {
	...recipeStoryMeta({
		description:
			'Multi-step `hero-wizard` recipe — hero background shell with progress bar and wizard actions. Configure shell via `view.shell` and progress via `view.progress`.',
	}),
	title: 'Recipes/Hero Wizard',
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'hero-wizard',
				shell: { backgroundImage: gradientImage, contentWidth: 'md' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const SmallContent: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'hero-wizard',
				shell: { backgroundImage: gradientImage, contentWidth: 'sm' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const LargeContent: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'hero-wizard',
				shell: { backgroundImage: gradientImage, contentWidth: 'xl' },
				progress: { showPercentage: true },
			},
		},
	},
};
