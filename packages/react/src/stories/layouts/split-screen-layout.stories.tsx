import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { FormTemplates } from '../shared/sample-forms';

const baseForm = FormTemplates.contactForm;

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
		config: FormTemplates.splitScreenForm,
	},
};

export const LeftSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Welcome to our platform! Fill out the form to get started.',
						sidePlacement: 'left',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

export const RightSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Welcome to our platform! Fill out the form to get started.',
						sidePlacement: 'right',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

export const NarrowSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Quick tip: Complete all required fields marked with an asterisk.',
						sidePlacement: 'left',
						sideWidth: 'narrow',
					},
				},
			],
		},
	},
};

export const NormalSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent:
							'Our platform helps you manage your projects efficiently. Get started by creating your account and exploring our features.',
						sidePlacement: 'left',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

export const WideSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent:
							'Welcome to our comprehensive platform! Here you can manage all aspects of your projects, collaborate with team members, track progress, and much more. Take your time filling out the form.',
						sidePlacement: 'left',
						sideWidth: 'wide',
					},
				},
			],
		},
	},
};

export const RightNarrowSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Quick tip: Save your progress regularly.',
						sidePlacement: 'right',
						sideWidth: 'narrow',
					},
				},
			],
		},
	},
};

export const RightWideSide: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent:
							'Thank you for choosing our service! We are committed to providing you with the best experience. Complete the form to unlock all features and benefits of our platform.',
						sidePlacement: 'right',
						sideWidth: 'wide',
					},
				},
			],
		},
	},
};

export const MinimalContent: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Get started',
						sidePlacement: 'left',
						sideWidth: 'narrow',
					},
				},
			],
		},
	},
};

export const DetailedContent: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					title: 'Comprehensive Account Setup',
					description: 'Please provide all the required information to create your complete profile',
					layout: {
						__id: 'split-screen',
						sideContent:
							'Complete Guide: Fill out each section carefully. Your information is secure and will be used only for account creation. If you need help, contact our support team.',
						sidePlacement: 'left',
						sideWidth: 'wide',
					},
				},
			],
		},
	},
};

export const LongContent: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent:
							'This example demonstrates how the split-screen layout handles longer form content. The side panel remains fixed while the main content area is scrollable, ensuring consistent branding and messaging throughout the form completion process. This is particularly useful for forms that collect detailed information across multiple fields.',
						sidePlacement: 'left',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

export const TopAligned: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Content aligned to the top of the main area',
						sidePlacement: 'left',
						contentAlignment: 'start',
					},
				},
			],
		},
	},
};

export const ContentAlignedCenter: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Content vertically centered in the main area',
						sidePlacement: 'left',
						sideWidth: 'normal',
						contentAlignment: 'center',
					},
				},
			],
		},
	},
};

export const ContentAlignedBottom: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Content aligned to the bottom of the main area',
						sidePlacement: 'left',
						sideWidth: 'normal',
						contentAlignment: 'bottom',
					},
				},
			],
		},
	},
};

export const RightSideCentered: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Side content on the right with centered main content',
						sidePlacement: 'right',
						sideWidth: 'normal',
						contentAlignment: 'center',
					},
				},
			],
		},
	},
};

export const ContactFormExample: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Our team is here to help you with any questions or concerns you may have.',
						sidePlacement: 'left',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

export const NewsletterSignupExample: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Join thousands of subscribers who receive weekly insights and exclusive content.',
						sidePlacement: 'right',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

export const FeedbackFormExample: Story = {
	args: {
		config: {
			...baseForm,
			steps: [
				{
					...baseForm.steps[0],
					layout: {
						__id: 'split-screen',
						sideContent: 'Your opinion matters',
						sidePlacement: 'left',
						sideWidth: 'narrow',
						contentAlignment: 'center',
					},
				},
			],
		},
	},
};

const multiStepForm = { ...FormTemplates.registrationForm, stepper: { __id: 'debugger' as const } };

export const MultiStepLeftSide: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					__id: 'split-screen',
					sideContent: 'Welcome to our platform. Complete each step to set up your account.',
					sidePlacement: 'left',
					sideWidth: 'normal',
				},
			})),
		},
	},
};

export const MultiStepRightSide: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					__id: 'split-screen',
					sideContent: 'Step-by-step setup guide. Your progress will be saved automatically.',
					sidePlacement: 'right',
					sideWidth: 'normal',
				},
			})),
		},
	},
};

export const MultiStepWidePanel: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					__id: 'split-screen',
					sideContent:
						'Comprehensive onboarding process. Take your time to fill out each section carefully. Your information is secure and will be used to personalize your experience.',
					sidePlacement: 'left',
					sideWidth: 'wide',
				},
			})),
		},
	},
};

export const MultiStepNarrowPanel: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					__id: 'split-screen',
					sideContent: 'Quick Setup',
					sidePlacement: 'left',
					sideWidth: 'narrow',
				},
			})),
		},
	},
};
