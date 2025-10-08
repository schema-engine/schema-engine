import type { Meta, StoryObj } from '@storybook/react-vite';
import { SplitScreenLayout } from '@/components/layouts';
import { FormRenderer } from '@/components/internals/form-renderer';
import { simpleContactForm } from '../shared/sample-forms';
import '../../components/layouts/split-screen-layout.css';

const meta = {
	title: 'Layouts/SplitScreenLayout',
	component: SplitScreenLayout,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	argTypes: {
		config: {
			control: 'object',
			description: 'Layout configuration options',
		},
		step: {
			control: 'object',
			description: 'Current step information',
		},
		form: {
			control: 'object',
			description: 'Form information',
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes',
		},
	},
	args: {
		children: <FormRenderer config={simpleContactForm} />,
		step: {
			id: 'step-1',
			title: 'Account Setup',
			description: 'Create your account to get started',
			index: 0,
			total: 3,
		},
		form: {
			id: 'example-form',
			title: 'Example Form',
			description: 'This is an example form',
		},
	},
} satisfies Meta<typeof SplitScreenLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {},
	},
};

export const LeftSide: Story = {
	args: {
		config: {
			sideContent: 'Welcome to our platform! Fill out the form to get started.',
			sidePlacement: 'left',
			sideWidth: 'normal',
		},
	},
};

export const RightSide: Story = {
	args: {
		config: {
			sideContent: 'Welcome to our platform! Fill out the form to get started.',
			sidePlacement: 'right',
			sideWidth: 'normal',
		},
	},
};

export const NarrowSide: Story = {
	args: {
		config: {
			sideContent: 'Quick tip: Complete all required fields marked with an asterisk.',
			sidePlacement: 'left',
			sideWidth: 'narrow',
		},
	},
};

export const NormalSide: Story = {
	args: {
		config: {
			sideContent:
				'Our platform helps you manage your projects efficiently. Get started by creating your account and exploring our features.',
			sidePlacement: 'left',
			sideWidth: 'normal',
		},
	},
};

export const WideSide: Story = {
	args: {
		config: {
			sideContent:
				'Welcome to our comprehensive platform! Here you can manage all aspects of your projects, collaborate with team members, track progress, and much more. Take your time filling out the form.',
			sidePlacement: 'left',
			sideWidth: 'wide',
		},
	},
};

export const RightNarrowSide: Story = {
	args: {
		config: {
			sideContent: 'Quick tip: Save your progress regularly.',
			sidePlacement: 'right',
			sideWidth: 'narrow',
		},
	},
};

export const RightWideSide: Story = {
	args: {
		config: {
			sideContent:
				'Thank you for choosing our service! We are committed to providing you with the best experience. Complete the form to unlock all features and benefits of our platform.',
			sidePlacement: 'right',
			sideWidth: 'wide',
		},
	},
};

export const MinimalContent: Story = {
	args: {
		config: {
			sideContent: 'Get started',
			sidePlacement: 'left',
			sideWidth: 'narrow',
		},
		step: {
			id: 'step-1',
			title: 'Step 1',
			index: 0,
			total: 3,
		},
	},
};

export const DetailedContent: Story = {
	args: {
		config: {
			sideContent:
				'Complete Guide: Fill out each section carefully. Your information is secure and will be used only for account creation. If you need help, contact our support team.',
			sidePlacement: 'left',
			sideWidth: 'wide',
		},
		step: {
			id: 'step-1',
			title: 'Comprehensive Account Setup',
			description: 'Please provide all the required information to create your complete profile',
			index: 0,
			total: 5,
		},
	},
};

export const ContentAlignedTop: Story = {
	args: {
		config: {
			sideContent: 'Content aligned to the top of the main area',
			sidePlacement: 'left',
			sideWidth: 'normal',
			contentAlignment: 'top',
		},
	},
};

export const ContentAlignedCenter: Story = {
	args: {
		config: {
			sideContent: 'Content vertically centered in the main area',
			sidePlacement: 'left',
			sideWidth: 'normal',
			contentAlignment: 'center',
		},
	},
};

export const ContentAlignedBottom: Story = {
	args: {
		config: {
			sideContent: 'Content aligned to the bottom of the main area',
			sidePlacement: 'left',
			sideWidth: 'normal',
			contentAlignment: 'bottom',
		},
	},
};

export const RightSideCentered: Story = {
	args: {
		config: {
			sideContent: 'Side content on the right with centered main content',
			sidePlacement: 'right',
			sideWidth: 'normal',
			contentAlignment: 'center',
		},
	},
};

export const SingleStepForm: Story = {
	args: {
		step: undefined,
		form: {
			id: 'contact-form',
			title: 'Get In Touch',
			description: 'Fill out the form and we will respond within 24 hours',
		},
		config: {
			sideContent: 'Our team is here to help you with any questions or concerns you may have.',
			sidePlacement: 'left',
			sideWidth: 'normal',
			contentAlignment: 'center',
		},
	},
};

export const SingleStepFormRightSide: Story = {
	args: {
		step: undefined,
		form: {
			id: 'newsletter-form',
			title: 'Subscribe to Newsletter',
			description: 'Get the latest updates delivered to your inbox',
		},
		config: {
			sideContent: 'Join thousands of subscribers who receive weekly insights and exclusive content.',
			sidePlacement: 'right',
			sideWidth: 'wide',
			contentAlignment: 'center',
		},
	},
};

export const SingleStepFormMinimal: Story = {
	args: {
		step: undefined,
		form: {
			id: 'feedback-form',
			title: 'Share Your Feedback',
		},
		config: {
			sideContent: 'Your opinion matters',
			sidePlacement: 'left',
			sideWidth: 'narrow',
			contentAlignment: 'center',
		},
	},
};
