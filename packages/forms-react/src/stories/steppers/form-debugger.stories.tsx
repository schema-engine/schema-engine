import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormDebugger } from '@/components/form-debugger';
import { FormTemplates } from '../shared/sample-forms';
import { StoryWrapper } from '../shared/story-wrapper';
import { getEngine, rhfAdapter } from '../shared/form-builder.ui';

const storyEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: storyEngine,
		adapter: rhfAdapter,
		children: <FormDebugger />,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Opt-in FormDebugger — mount it as a child of FormRenderer to inspect values, errors, and step state without replacing the production stepper.',
			},
		},
	},
	decorators: [(Story) => <StoryWrapper engine={storyEngine}>{Story()}</StoryWrapper>],
	argTypes: {
		engine: { table: { disable: true } },
		adapter: { table: { disable: true } },
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			stepper: { $type: 'default' },
		},
	},
};

export const WithMinimalistStepper: Story = {
	args: {
		config: {
			...FormTemplates.registrationForm,
			title: 'Product Survey',
			stepper: { $type: 'minimalist', showProgress: true },
		},
	},
};

export const ComplexForm: Story = {
	args: {
		config: {
			...FormTemplates.onboardingSurvey,
			title: 'Complex Application Form',
			stepper: { $type: 'default', orientation: 'horizontal' },
		},
	},
};

export const OpenByDefault: Story = {
	args: {
		children: <FormDebugger defaultOpen />,
		config: {
			...FormTemplates.registrationForm,
			stepper: { $type: 'default' },
		},
	},
};
