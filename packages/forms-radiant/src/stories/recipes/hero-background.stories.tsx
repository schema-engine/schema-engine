import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { formRendererMeta } from '@/stories/shared/form-story';
import { recipeStoryMeta } from './shared/recipe-story';

const gradientImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';

const meta = {
	...recipeStoryMeta({
		description:
			'Single-step `hero-background` recipe — form content over a full-height background image or video via `view.shell`.',
	}),
	title: 'Recipes/Hero Background',
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			view: {
				$type: 'hero-background',
				shell: { backgroundImage: gradientImage, contentWidth: 'md' },
			},
		},
	},
};

export const WithoutImage: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			view: { $type: 'hero-background' },
		},
	},
};

export const SmallContent: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			view: {
				$type: 'hero-background',
				shell: { backgroundImage: gradientImage, contentWidth: 'sm' },
			},
		},
	},
};

export const LargeContent: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			view: {
				$type: 'hero-background',
				shell: { backgroundImage: gradientImage, contentWidth: 'xl' },
			},
		},
	},
};
