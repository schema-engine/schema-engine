import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormDebugger } from '@/components/form-debugger';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { rhfAdapter } from '@/stories/shared/form-builder.ui';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const meta = {
	title: 'Recipes/Form Debugger',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
		adapter: rhfAdapter,
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
		adapter: { table: { disable: true } },
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wizard: Story = {
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

export const CardWizard: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Product Survey',
			view: {
				$type: 'card-wizard',
				shell: { maxWidth: 'md', padding: 'md', shadowSize: 'md' },
				progress: { showPercentage: true },
			},
		},
	},
};

export const ComplexForm: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Complex Application Form',
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
