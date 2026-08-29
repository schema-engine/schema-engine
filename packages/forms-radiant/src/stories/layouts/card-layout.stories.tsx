import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta, minimalistStepper, withStepLayout } from '@/stories/shared/form-story';
import { FormTemplates } from '@/stories/shared/sample-forms';
import { createLayoutPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	title: 'Layouts/Card',
	parameters: { ...formRendererMeta.parameters, layout: 'fullscreen' },
	args: {
		className: 'se-form-story--full',
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

const cardPlay = createLayoutPlay(['.card-layout', '.card-layout__card']);

export const Default: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, { $type: 'card' }),
	},
	play: cardPlay,
};

export const SmallCard: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, {
			$type: 'card',
			maxWidth: 'sm',
			padding: 'sm',
			shadowSize: 'sm',
		}),
	},
	play: createLayoutPlay(['.card-layout__card--sm']),
};

export const MediumCard: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, {
			$type: 'card',
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'md',
		}),
	},
	play: createLayoutPlay(['.card-layout__card--md']),
};

export const LargeCard: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, {
			$type: 'card',
			maxWidth: 'lg',
			padding: 'lg',
			shadowSize: 'lg',
		}),
	},
	play: createLayoutPlay(['.card-layout__card--lg']),
};

export const ExtraLargeCard: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, {
			$type: 'card',
			maxWidth: 'xl',
			padding: 'lg',
			shadowSize: 'xl',
		}),
	},
	play: createLayoutPlay(['.card-layout__card--xl']),
};

export const MultiStep: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, {
			$type: 'card',
			maxWidth: 'md',
			padding: 'md',
			shadowSize: 'md',
		}),
	},
	play: cardPlay,
};

export const MultiStepWithMinimalistStepper: Story = {
	args: {
		config: withStepLayout(
			{
				...FormTemplates.registrationForm,
				stepper: minimalistStepper,
			},
			{
				$type: 'card',
				maxWidth: 'md',
				padding: 'md',
				shadowSize: 'md',
			},
		),
	},
	play: cardPlay,
};
