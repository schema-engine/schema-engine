import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { FormTemplates } from '../shared/sample-forms';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
	tags: ['autodocs'],
	argTypes: {
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
				layout: { __id: 'card' },
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
				layout: { __id: 'card', maxWidth: 'sm', padding: 'sm', shadowSize: 'sm' },
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
				layout: { __id: 'card', maxWidth: 'md', padding: 'md', shadowSize: 'md' },
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
				layout: { __id: 'card', maxWidth: 'lg', padding: 'lg', shadowSize: 'lg' },
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
				layout: { __id: 'card', maxWidth: 'xl', padding: 'lg', shadowSize: 'xl' },
			})),
		},
	},
};

export const MultiStep: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: { __id: 'debugger' },
			steps: FormTemplates.registrationForm.steps.map((step) => ({
				...step,
				layout: { __id: 'card', maxWidth: 'md', padding: 'md', shadowSize: 'md' },
			})),
		},
	},
};
