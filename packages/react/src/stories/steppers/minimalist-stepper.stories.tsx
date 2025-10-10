import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { multiStepRegistrationForm } from '../shared/sample-forms';
import '../../components/steppers/minimalist-stepper.css';

const meta = {
	title: 'Steppers/MinimalistStepper',
	component: FormRenderer,
	parameters: {
		layout: 'padded',
	},
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
				__stepperId: 'minimalist',
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
				__stepperId: 'minimalist',
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
				__stepperId: 'minimalist',
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
				__stepperId: 'minimalist',
				showProgress: true,
			},
		},
	},
};
