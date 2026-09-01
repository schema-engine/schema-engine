import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { rhfAdapter } from '@/stories/shared/form-builder.ui';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const gradientImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';
const natureImage = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80';
const gradientAltImage = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80';

const meta = {
	title: 'Recipes/Hero Wizard',
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
					'Multi-step `hero-wizard` recipe — hero background shell with progress bar and wizard actions. Configure shell via `view.shell` and progress via `view.progress`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: false,
			description: 'Form config with `view.$type: "hero-wizard"`',
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
				$type: 'hero-wizard',
				shell: { backgroundImage: gradientImage, contentWidth: 'md' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const NatureBackground: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'hero-wizard',
				shell: { backgroundImage: natureImage, contentWidth: 'lg' },
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
				shell: { backgroundImage: gradientAltImage, contentWidth: 'sm' },
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
