import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormDebugger } from '@/debugger.js';
import { FormTemplates } from '@/stories/shared/sample-forms.js';
import { formRendererMeta } from '@/stories/shared/form-story.js';
import { recipeStoryMeta } from './shared/recipe-story.js';

const recipeMeta = recipeStoryMeta({
	layout: 'padded',
	description:
		'Opt-in FormDebugger — mount it as a child of FormRenderer to inspect values, errors, and step state inside the recipe content slot.',
});

const meta = {
	...recipeMeta,
	title: 'Recipes/Form Debugger',
	args: {
		...recipeMeta.args,
		children: <FormDebugger />,
	},
} satisfies Meta<typeof formRendererMeta.component>;

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
