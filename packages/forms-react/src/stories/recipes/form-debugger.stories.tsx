import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { FormDebugger } from '@/debugger.js';
import { FormTemplates } from '@/stories/shared/sample-forms.js';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story.js';

const meta = {
	title: 'Recipes/Form Debugger',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
		children: <FormDebugger />,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Opt-in FormDebugger — mount it as a child of FormRenderer to inspect values, errors, and step state inside the recipe content slot.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true, showStepDescriptions: false },
			},
		},
	},
};

export const OpenByDefault: Story = {
	args: {
		children: <FormDebugger defaultOpen />,
		config: {
			...FormTemplates.registrationForm,
			view: {
				$type: 'sidebar-wizard',
				progress: { orientation: 'sidebar', showStepTitles: true },
			},
		},
	},
};
