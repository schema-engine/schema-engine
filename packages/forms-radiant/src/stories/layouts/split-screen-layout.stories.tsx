import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta, withStepLayout } from '@/stories/shared/form-story';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { createLayoutPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	parameters: { ...formRendererMeta.parameters, layout: 'fullscreen' },
	args: {
		className: 'se-form-story--full',
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseForm = FormTemplates.contactForm;
const layoutPlay = createLayoutPlay([
	'.split-screen-layout',
	'.split-screen-layout__side',
	'.split-screen-layout__side-content',
	'.split-screen-layout__main',
]);

const multiStepForm = {
	...FormTemplates.registrationForm,
	stepper: { $type: 'default' as const },
};

export const Default: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent:
				'Welcome back! Sign in to access your account, manage your profile, and pick up where you left off.',
		}),
	},
	play: layoutPlay,
};

export const RightSide: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Welcome to our platform! Fill out the form to get started.',
			sidePlacement: 'right',
			sideWidth: 'normal',
		}),
	},
	play: layoutPlay,
};

export const NarrowSide: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Quick tip: Complete all required fields marked with an asterisk.',
			sidePlacement: 'left',
			sideWidth: 'narrow',
		}),
	},
	play: layoutPlay,
};

export const NormalSide: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent:
				'Our platform helps you manage your projects efficiently. Get started by creating your account and exploring our features.',
			sidePlacement: 'left',
			sideWidth: 'normal',
		}),
	},
	play: layoutPlay,
};

export const WideSide: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent:
				'Welcome to our comprehensive platform! Here you can manage all aspects of your projects, collaborate with team members, track progress, and much more. Take your time filling out the form.',
			sidePlacement: 'left',
			sideWidth: 'wide',
		}),
	},
	play: layoutPlay,
};

export const RightNarrowSide: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Quick tip: Save your progress regularly.',
			sidePlacement: 'right',
			sideWidth: 'narrow',
		}),
	},
	play: layoutPlay,
};

export const RightWideSide: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent:
				'Thank you for choosing our service! We are committed to providing you with the best experience. Complete the form to unlock all features and benefits of our platform.',
			sidePlacement: 'right',
			sideWidth: 'wide',
		}),
	},
	play: layoutPlay,
};

export const TopAligned: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Content aligned to the top of the main area',
			sidePlacement: 'left',
			contentAlignment: 'top',
		}),
	},
	play: layoutPlay,
};

export const ContentAlignedCenter: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Content vertically centered in the main area',
			sidePlacement: 'left',
			sideWidth: 'normal',
			contentAlignment: 'center',
		}),
	},
	play: layoutPlay,
};

export const ContentAlignedBottom: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Content aligned to the bottom of the main area',
			sidePlacement: 'left',
			sideWidth: 'normal',
			contentAlignment: 'bottom',
		}),
	},
	play: layoutPlay,
};

export const ContactFormExample: Story = {
	args: {
		config: withStepLayout(baseForm, {
			$type: 'split-screen',
			sideContent: 'Our team is here to help you with any questions or concerns you may have.',
			sidePlacement: 'left',
			sideWidth: 'normal',
		}),
	},
	play: layoutPlay,
};

export const MultiStepLeftSide: Story = {
	args: {
		config: withStepLayout(multiStepForm, {
			$type: 'split-screen',
			sideContent: 'Welcome to our platform. Complete each step to set up your account.',
			sidePlacement: 'left',
			sideWidth: 'normal',
		}),
	},
	play: layoutPlay,
};

export const MultiStepRightSide: Story = {
	args: {
		config: withStepLayout(multiStepForm, {
			$type: 'split-screen',
			sideContent: 'Step-by-step setup guide. Your progress will be saved automatically.',
			sidePlacement: 'right',
			sideWidth: 'normal',
		}),
	},
	play: layoutPlay,
};

export const MultiStepWidePanel: Story = {
	args: {
		config: withStepLayout(multiStepForm, {
			$type: 'split-screen',
			sideContent:
				'Comprehensive onboarding process. Take your time to fill out each section carefully. Your information is secure and will be used to personalize your experience.',
			sidePlacement: 'left',
			sideWidth: 'wide',
		}),
	},
	play: layoutPlay,
};

export const MultiStepNarrowPanel: Story = {
	args: {
		config: withStepLayout(multiStepForm, {
			$type: 'split-screen',
			sideContent: 'Quick Setup',
			sidePlacement: 'left',
			sideWidth: 'narrow',
		}),
	},
	play: layoutPlay,
};
