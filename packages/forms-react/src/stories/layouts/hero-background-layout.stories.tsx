import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { FormTemplates } from '../shared/sample-forms';
import { getEngine, rhfAdapter } from '../shared/form-builder.ui';

const storyEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: storyEngine,
		adapter: rhfAdapter,
	},
	parameters: {
		layout: 'fullscreen',
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={storyEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with layout options',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [{ ...FormTemplates.contactForm.steps[0], layout: { $type: 'hero-background' } }],
		},
	},
};

export const WithBackgroundImage: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
						contentWidth: 'md',
					},
				},
			],
		},
	},
};

export const SmallContent: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
						contentWidth: 'sm',
					},
				},
			],
		},
	},
};

export const MediumContent: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
						contentWidth: 'md',
					},
				},
			],
		},
	},
};

export const LargeContent: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
						contentWidth: 'lg',
					},
				},
			],
		},
	},
};

export const ExtraLargeContent: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
						contentWidth: 'xl',
					},
				},
			],
		},
	},
};

export const GradientBackground: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80',
						contentWidth: 'md',
					},
				},
			],
		},
	},
};

export const NatureBackground: Story = {
	args: {
		config: {
			...FormTemplates.contactForm,
			steps: [
				{
					...FormTemplates.contactForm.steps[0],
					layout: {
						$type: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
						contentWidth: 'lg',
					},
				},
			],
		},
	},
};

const multiStepForm = { ...FormTemplates.registrationForm, stepper: { $type: 'default' as const } };

export const MultiStepWithBackground: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					$type: 'hero-background',
					backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
					contentWidth: 'md',
				},
			})),
		},
	},
};

export const MultiStepNatureBackground: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					$type: 'hero-background',
					backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
					contentWidth: 'lg',
				},
			})),
		},
	},
};

export const MultiStepSmallContent: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					$type: 'hero-background',
					backgroundImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80',
					contentWidth: 'sm',
				},
			})),
		},
	},
};

export const MultiStepLargeContent: Story = {
	args: {
		config: {
			...multiStepForm,
			steps: multiStepForm.steps.map((step) => ({
				...step,
				layout: {
					$type: 'hero-background',
					backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
					contentWidth: 'xl',
				},
			})),
		},
	},
};
