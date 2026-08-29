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
			description: 'Form configuration with layout settings',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const cardMd = { $type: 'card' as const, maxWidth: 'md' as const, padding: 'md' as const, shadowSize: 'md' as const };

export const Default: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, { $type: 'card' }),
	},
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
};

export const MediumCard: Story = {
	args: {
		config: withStepLayout(FormTemplates.loginForm, cardMd),
	},
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
};

export const MultiStep: Story = {
	args: {
		config: withStepLayout(FormTemplates.registrationForm, cardMd),
	},
};

export const MultiStepWithMinimalistStepper: Story = {
	args: {
		config: withStepLayout({ ...FormTemplates.registrationForm, stepper: minimalistStepper }, cardMd),
	},
};
