import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { rhfAdapter } from '@/stories/shared/form-builder.ui';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const gradientImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';

const meta = {
	title: 'Recipes/Hero Background',
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
					'Single-step `hero-background` recipe — form content over a full-height background image or video via `view.shell`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: false,
			description: 'Form config with `view.$type: "hero-background"`',
		},
	},
} satisfies Meta<typeof FormRenderer>;

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
