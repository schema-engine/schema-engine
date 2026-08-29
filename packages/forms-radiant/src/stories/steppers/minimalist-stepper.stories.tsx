import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { createStepperPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	title: 'Steppers/Minimalist',
	parameters: { ...formRendererMeta.parameters, layout: 'padded' },
	args: {
		className: 'se-form-story--full',
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

const stepperPlay = createStepperPlay();

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
	play: stepperPlay,
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
	play: stepperPlay,
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
	play: stepperPlay,
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
	play: stepperPlay,
};
