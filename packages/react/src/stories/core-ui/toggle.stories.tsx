import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from '@/components/core-ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

const meta = {
	component: Toggle,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A toggle button component for switching between two states.',
			},
		},
	},
	argTypes: {
		pressed: {
			control: 'boolean',
			description: 'Whether the toggle is pressed',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the toggle',
		},
	},
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		defaultPressed: false,
	},
	render: (args) => (
		<Toggle {...args}>
			<Bold className="h-4 w-4" />
		</Toggle>
	),
};

export const WithIcon: Story = {
	render: () => (
		<div className="flex gap-2 border rounded-md p-1">
			<Toggle defaultPressed={false}>
				<Bold className="h-4 w-4" />
			</Toggle>
			<Toggle defaultPressed={false}>
				<Italic className="h-4 w-4" />
			</Toggle>
			<Toggle defaultPressed={false}>
				<Underline className="h-4 w-4" />
			</Toggle>
		</div>
	),
};

export const Pressed: Story = {
	args: {
		defaultPressed: true,
	},
	render: (args) => (
		<Toggle {...args}>
			<Bold className="h-4 w-4" />
		</Toggle>
	),
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultPressed: false,
	},
	render: (args) => (
		<Toggle {...args}>
			<Bold className="h-4 w-4" />
		</Toggle>
	),
};
