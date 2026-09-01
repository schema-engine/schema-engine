import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { rhfAdapter } from '@/stories/shared/form-builder.ui';
import { recipeStoryDecorators, recipeStoryEngine } from './shared/recipe-story';

const contactForm = FormTemplates.contactForm;

const meta = {
	title: 'Recipes/Split Screen',
	component: FormRenderer,
	args: {
		engine: recipeStoryEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Single-step `split-screen` recipe — two-column layout with side content and a configurable main form area via `view.shell`.',
			},
		},
	},
	decorators: recipeStoryDecorators,
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form config with `view.$type: "split-screen"`',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Welcome back! Sign in to access your account, manage your profile, and pick up where you left off.',
				},
			},
		},
	},
};

export const RightSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Welcome to our platform! Fill out the form to get started.',
					sidePlacement: 'right',
					sideWidth: 'normal',
				},
			},
		},
	},
};

export const NarrowSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Quick tip: Complete all required fields marked with an asterisk.',
					sidePlacement: 'left',
					sideWidth: 'narrow',
				},
			},
		},
	},
};

export const NormalSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Our platform helps you manage your projects efficiently. Get started by creating your account and exploring our features.',
					sidePlacement: 'left',
					sideWidth: 'normal',
				},
			},
		},
	},
};

export const WideSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Welcome to our comprehensive platform! Here you can manage all aspects of your projects, collaborate with team members, track progress, and much more. Take your time filling out the form.',
					sidePlacement: 'left',
					sideWidth: 'wide',
				},
			},
		},
	},
};

export const RightNarrowSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Quick tip: Save your progress regularly.',
					sidePlacement: 'right',
					sideWidth: 'narrow',
				},
			},
		},
	},
};

export const RightWideSide: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Thank you for choosing our service! We are committed to providing you with the best experience. Complete the form to unlock all features and benefits of our platform.',
					sidePlacement: 'right',
					sideWidth: 'wide',
				},
			},
		},
	},
};

export const MinimalContent: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Get started',
					sidePlacement: 'left',
					sideWidth: 'narrow',
				},
			},
		},
	},
};

export const DetailedContent: Story = {
	args: {
		config: {
			...contactForm,
			steps: [
				{
					...contactForm.steps[0],
					title: 'Comprehensive Account Setup',
					description: 'Please provide all the required information to create your complete profile',
				},
			],
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'Complete Guide: Fill out each section carefully. Your information is secure and will be used only for account creation. If you need help, contact our support team.',
					sidePlacement: 'left',
					sideWidth: 'wide',
				},
			},
		},
	},
};

export const LongContent: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent:
						'This example demonstrates how the split-screen layout handles longer form content. The side panel remains fixed while the main content area is scrollable, ensuring consistent branding and messaging throughout the form completion process. This is particularly useful for forms that collect detailed information across multiple fields.',
					sidePlacement: 'left',
					sideWidth: 'normal',
				},
			},
		},
	},
};

export const TopAligned: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Content aligned to the top of the main area',
					sidePlacement: 'left',
					contentAlignment: 'top',
				},
			},
		},
	},
};

export const ContentAlignedCenter: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Content vertically centered in the main area',
					sidePlacement: 'left',
					sideWidth: 'normal',
					contentAlignment: 'center',
				},
			},
		},
	},
};

export const ContentAlignedBottom: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Content aligned to the bottom of the main area',
					sidePlacement: 'left',
					sideWidth: 'normal',
					contentAlignment: 'bottom',
				},
			},
		},
	},
};

export const RightSideCentered: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Side content on the right with centered main content',
					sidePlacement: 'right',
					sideWidth: 'normal',
					contentAlignment: 'center',
				},
			},
		},
	},
};

export const ContactFormExample: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Our team is here to help you with any questions or concerns you may have.',
					sidePlacement: 'left',
					sideWidth: 'normal',
				},
			},
		},
	},
};

export const NewsletterSignupExample: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Join thousands of subscribers who receive weekly insights and exclusive content.',
					sidePlacement: 'right',
					sideWidth: 'normal',
				},
			},
		},
	},
};

export const FeedbackFormExample: Story = {
	args: {
		config: {
			...contactForm,
			view: {
				$type: 'split-screen',
				shell: {
					sideContent: 'Your opinion matters',
					sidePlacement: 'left',
					sideWidth: 'narrow',
					contentAlignment: 'center',
				},
			},
		},
	},
};
