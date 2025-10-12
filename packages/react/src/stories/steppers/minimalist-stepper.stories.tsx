import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '../shared/form-builder';
import { StoryWrapper } from '../shared/story-wrapper';

const multiStepRegistrationForm = FormTemplates.registrationForm();

const meta = {
	title: 'Steppers/MinimalistStepper',
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
	tags: ['autodocs'],
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
			...multiStepRegistrationForm,
			stepper: {
				__id: 'minimalist',
				showProgress: true,
			},
		},
	},
};

export const WithProgress: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__id: 'minimalist',
				showProgress: true,
			},
		},
	},
};

export const WithoutProgress: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__id: 'minimalist',
				showProgress: false,
			},
		},
	},
};

export const LongForm: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			title: 'Extended Registration Form',
			description: 'A longer multi-step form with more steps',
			stepper: {
				__id: 'minimalist',
				showProgress: true,
			},
		},
	},
};
