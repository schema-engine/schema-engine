import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '../shared/sample-forms';
import { StoryWrapper } from '../shared/story-wrapper';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
	},
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		config: {
			control: 'object',
			description: 'Form configuration with stepper settings',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'minimalist',
				showProgress: true,
			},
		},
	},
};

export const WithProgress: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'minimalist',
				showProgress: true,
			},
		},
	},
};

export const WithoutProgress: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'minimalist',
				showProgress: false,
			},
		},
	},
};

export const LongForm: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Extended Registration Form',
			description: 'A longer multi-step form with more steps',
			stepper: {
				$type: 'minimalist',
				showProgress: true,
			},
		},
	},
};
