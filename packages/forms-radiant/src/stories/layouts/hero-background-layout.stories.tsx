import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta, minimalistStepper, withStepLayout } from '@/stories/shared/form-story';
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

const heroPlay = createLayoutPlay(['.hero-background-layout', '.hero-background-layout__form']);
const gradientImage = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';
const natureImage = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80';
const heroBackgroundLayout = {
	$type: 'hero-background' as const,
	backgroundImage: gradientImage,
	contentWidth: 'md' as const,
};

export const Default: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, { $type: 'hero-background' }),
	},
	play: heroPlay,
};

export const WithBackgroundImage: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'md',
		}),
	},
	play: heroPlay,
};

export const SmallContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'sm',
		}),
	},
	play: createLayoutPlay(['.hero-background-layout__content--sm']),
};

export const MediumContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'md',
		}),
	},
	play: createLayoutPlay(['.hero-background-layout__content--md']),
};

export const LargeContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'lg',
		}),
	},
	play: createLayoutPlay(['.hero-background-layout__content--lg']),
};

export const ExtraLargeContent: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: gradientImage,
			contentWidth: 'xl',
		}),
	},
	play: createLayoutPlay(['.hero-background-layout__content--xl']),
};

export const NatureBackground: Story = {
	args: {
		config: withStepLayout(FormTemplates.contactForm, {
			$type: 'hero-background',
			backgroundImage: natureImage,
			contentWidth: 'lg',
		}),
	},
	play: heroPlay,
};

export const MultiStepWithBackground: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, heroBackgroundLayout),
	},
	play: heroPlay,
};

export const MultiStepWithMinimalistStepper: Story = {
	args: {
		config: withStepLayout(
			{
				...FormTemplates.registrationForm,
				stepper: minimalistStepper,
			},
			heroBackgroundLayout,
		),
	},
	play: heroPlay,
};
