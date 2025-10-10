import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { multiStepRegistrationForm } from '../shared/sample-forms';
import '../../components/steppers/default-stepper.css';

const meta = {
	title: 'Steppers/DefaultStepper',
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
				__stepperId: 'default',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			},
		},
	},
};

export const WithDescriptions: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'default',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			},
		},
	},
};

export const NumbersOnly: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'default',
				showStepNumbers: true,
				showStepTitles: false,
				showStepDescriptions: false,
			},
		},
	},
};

export const TitlesOnly: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'default',
				showStepNumbers: false,
				showStepTitles: true,
				showStepDescriptions: false,
			},
		},
	},
};

export const MinimalInfo: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'default',
				showStepNumbers: false,
				showStepTitles: false,
				showStepDescriptions: false,
			},
		},
	},
};

export const FullInfo: Story = {
	args: {
		config: {
			...multiStepRegistrationForm,
			stepper: {
				__stepperId: 'default',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			},
		},
	},
};
