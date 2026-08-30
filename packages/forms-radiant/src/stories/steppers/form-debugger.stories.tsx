import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { FormDebugger } from '@/components/form-debugger';
import { formRendererMeta } from '@/stories/shared/form-story';
import { FormTemplates } from '@/stories/shared/sample-forms';

const meta = {
	...formRendererMeta,
	args: {
		className: 'se-form-story--full',
	},
	parameters: {
		...formRendererMeta.parameters,
		layout: 'padded',
		docs: {
			description: {
				component:
					'Opt-in FormDebugger — render it inside FormRenderer to inspect values, errors, and step state.',
			},
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { config: { ...FormTemplates.registrationForm, stepper: { $type: 'default' } }, children: <FormDebugger /> },
};

export const OpenByDefault: Story = {
	args: {
		config: { ...FormTemplates.registrationForm, stepper: { $type: 'default' } },
		children: <FormDebugger defaultOpen />,
	},
};
