import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from '@/components/core-ui/switch';
import { Label } from '@/components/core-ui/label';

const meta = {
	component: Switch,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A toggle switch component for boolean values.',
			},
		},
	},
	argTypes: {
		checked: {
			control: 'boolean',
			description: 'Whether the switch is on',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the switch',
		},
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		defaultChecked: false,
	},
};

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultChecked: false,
	},
};

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		defaultChecked: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center space-x-3">
			<Switch />
			<Label className="cursor-pointer font-normal">Enable notifications</Label>
		</div>
	),
};

export const Settings: Story = {
	render: () => (
		<div className="space-y-4 max-w-sm">
			<div className="flex items-center justify-between">
				<Label className="font-normal">Email Notifications</Label>
				<Switch defaultChecked />
			</div>
			<div className="flex items-center justify-between">
				<Label className="font-normal">Push Notifications</Label>
				<Switch />
			</div>
			<div className="flex items-center justify-between">
				<Label className="font-normal">SMS Alerts</Label>
				<Switch defaultChecked />
			</div>
		</div>
	),
};
