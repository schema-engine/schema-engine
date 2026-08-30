import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { createStepperPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	parameters: { ...formRendererMeta.parameters, layout: 'padded' },
	args: {
		className: 'se-form-story--full',
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

const stepperPlay = createStepperPlay();

export const HorizontalDefault: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			},
		},
	},
	play: stepperPlay,
};

export const HorizontalWithDescriptions: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			},
		},
	},
	play: stepperPlay,
};

export const HorizontalNumbersOnly: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: false,
				showStepDescriptions: false,
			},
		},
	},
	play: stepperPlay,
};

export const HorizontalFourSteps: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			stepper: {
				$type: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			},
		},
	},
	play: stepperPlay,
};

export const SidebarDefault: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'default',
				orientation: 'sidebar',
				showStepNumbers: true,
				showStepTitles: true,
			},
		},
	},
	play: stepperPlay,
};

export const SidebarFourSteps: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			stepper: {
				$type: 'default',
				orientation: 'sidebar',
				showStepNumbers: true,
				showStepTitles: true,
			},
		},
	},
	play: stepperPlay,
};

export const SidebarWithLongContent: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			title: 'Extended Onboarding',
			description: 'Complete profile setup with detailed information',
			stepper: {
				$type: 'default',
				orientation: 'sidebar',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			},
		},
	},
	play: stepperPlay,
};
