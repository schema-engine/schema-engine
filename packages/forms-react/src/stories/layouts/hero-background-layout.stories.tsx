import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { FormTemplates } from '../shared/sample-forms';
import { getEngine, rhfAdapter } from '../shared/form-builder.ui';
import { minimalistStepper, withStepLayout } from '../shared/form-story';

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
			control: false,
			description: 'Form configuration with layout options',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const gradientImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';
const natureImage = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80';
const gradientAltImage = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80';

export const Default: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, { $type: 'hero-background' }),
	},
};

export const WithBackgroundImage: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'md',
		}),
	},
};

export const SmallContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'sm',
		}),
	},
};

export const MediumContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'md',
		}),
	},
};

export const LargeContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'lg',
		}),
	},
};

export const ExtraLargeContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'xl',
		}),
	},
};

export const GradientBackground: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientAltImage,
			contentWidth: 'md',
		}),
	},
};

export const NatureBackground: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: natureImage,
			contentWidth: 'lg',
		}),
	},
};

const heroMd = {
	$type: 'hero-background' as const,
	backgroundImage: gradientImage,
	contentWidth: 'md' as const,
};

export const MultiStepWithBackground: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, heroMd),
	},
};

export const MultiStepWithMinimalistStepper: Story = {
	args: {
		config: withStepLayout({ ...FormTemplates.registrationForm, stepper: minimalistStepper }, heroMd),
	},
};

export const MultiStepNatureBackground: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, {
			$type: 'hero-background',
			backgroundImage: natureImage,
			contentWidth: 'lg',
		}),
	},
};

export const MultiStepSmallContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, {
			$type: 'hero-background',
			backgroundImage: gradientAltImage,
			contentWidth: 'sm',
		}),
	},
};

export const MultiStepLargeContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'xl',
		}),
	},
};
