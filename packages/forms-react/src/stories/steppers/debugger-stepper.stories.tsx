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
					'Modern developer tool widget with FAB button. Perfect for debugging multi-step forms with detailed step information, progress tracking, and form state inspection. Features a collapsible panel that stays out of the way until needed.',
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
	argTypes: {
		config: {
			control: 'object',
			description: 'Form configuration with debugger stepper settings',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: {
				$type: 'debugger',
				showStepDetails: true,
				defaultExpanded: false,
				showFormState: true,
			},
		},
	},
};

export const ExpandedByDefault: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Product Survey',
			description: 'Debugger starts expanded',
			stepper: {
				$type: 'debugger',
				showStepDetails: true,
				defaultExpanded: true,
				showFormState: true,
			},
		},
	},
};

export const MinimalDebugInfo: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Quick Survey',
			description: 'Minimal debug information',
			stepper: {
				$type: 'debugger',
				showStepDetails: false,
				defaultExpanded: false,
				showFormState: false,
			},
		},
	},
};

export const WithComplexForm: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			title: 'Complex Application Form',
			description: 'Multi-step form with validation and many steps',
			stepper: {
				$type: 'debugger',
				showStepDetails: true,
				defaultExpanded: false,
				showFormState: true,
			},
		},
	},
};
