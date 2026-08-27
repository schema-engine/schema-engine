import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { FormTemplates } from '../shared/sample-forms';
import { getEngine, rhfAdapter } from '../shared/form-builder.ui';

const storyEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: storyEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={storyEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with layout settings',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			steps: FormTemplates.loginForm.steps.map((step) => ({
				...step,
				layout: { $type: 'card' },
			})),
		},
	},
};

export const SmallCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			steps: FormTemplates.loginForm.steps.map((step) => ({
				...step,
				layout: { $type: 'card', maxWidth: 'sm', padding: 'sm', shadowSize: 'sm' },
			})),
		},
	},
};

export const MediumCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			steps: FormTemplates.loginForm.steps.map((step) => ({
				...step,
				layout: { $type: 'card', maxWidth: 'md', padding: 'md', shadowSize: 'md' },
			})),
		},
	},
};

export const LargeCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			steps: FormTemplates.loginForm.steps.map((step) => ({
				...step,
				layout: { $type: 'card', maxWidth: 'lg', padding: 'lg', shadowSize: 'lg' },
			})),
		},
	},
};

export const ExtraLargeCard: Story = {
	args: {
		config: {
			...FormTemplates.loginForm,
			steps: FormTemplates.loginForm.steps.map((step) => ({
				...step,
				layout: { $type: 'card', maxWidth: 'xl', padding: 'lg', shadowSize: 'xl' },
			})),
		},
	},
};

export const MultiStep: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: { $type: 'default' },
			steps: FormTemplates.registrationForm.steps.map((step) => ({
				...step,
				layout: { $type: 'card', maxWidth: 'md', padding: 'md', shadowSize: 'md' },
			})),
		},
	},
};
