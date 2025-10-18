import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormTemplates } from '../shared/sample-forms';
import { StoryWrapper } from '../shared/story-wrapper';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Flexible stepper supporting both horizontal (mobile-friendly, scrollable) and sidebar (desktop, vertical timeline) orientations. Features edge-to-edge connector design.',
			},
		},
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
			description: 'Form configuration with stepper settings',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HorizontalDefault: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				__id: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			},
		},
	},
};

export const HorizontalWithDescriptions: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				__id: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: true,
			},
		},
	},
};

export const HorizontalNumbersOnly: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				__id: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: false,
				showStepDescriptions: false,
			},
		},
	},
};

export const HorizontalFourSteps: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			stepper: {
				__id: 'default',
				orientation: 'horizontal',
				showStepNumbers: true,
				showStepTitles: true,
				showStepDescriptions: false,
			},
		},
	},
};

export const SidebarDefault: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				__id: 'default',
				orientation: 'sidebar',
			},
		},
	},
};

export const SidebarFourSteps: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			stepper: {
				__id: 'default',
				orientation: 'sidebar',
			},
		},
	},
};

export const SidebarWithLongContent: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			title: 'Extended Onboarding',
			description: 'Complete profile setup with detailed information',
			stepper: {
				__id: 'default',
				orientation: 'sidebar',
			},
		},
	},
};
