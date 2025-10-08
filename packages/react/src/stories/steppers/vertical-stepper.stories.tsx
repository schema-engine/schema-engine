import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { multiStepRegistrationForm } from '../shared/sample-forms';
import '../../components/steppers/vertical-stepper.css';

const meta = {
	title: 'Steppers/VerticalStepper',
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
				__stepperId: 'vertical',
				showConnectors: true,
			},
		},
	},
};

export const WithConnectors: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'vertical',
				showConnectors: true,
			},
		},
	},
};

export const WithoutConnectors: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'vertical',
				showConnectors: false,
			},
		},
	},
};

export const LongForm: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			title: 'Extended Registration Form',
			description: 'A longer multi-step form with vertical navigation',
			stepper: {
				__stepperId: 'vertical',
				showConnectors: true,
			},
		},
	},
};
