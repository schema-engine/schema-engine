import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '@/components/core-ui/label';
import { Input } from '@/components/core-ui/input';
import { Checkbox } from '@/components/core-ui/checkbox';

const meta = {
	component: Label,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A label component for form inputs built on Base UI.',
			},
		},
	},
	argTypes: {
		children: {
			control: 'text',
			description: 'Label text',
		},
	},
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: 'Label text',
	},
};

export const WithInput: Story = {
	render: () => (
		<div className="space-y-2 max-w-sm">
			<Label>Email Address</Label>
			<Input type="email" placeholder="john@example.com" />
		</div>
	),
};

export const WithCheckbox: Story = {
	render: () => (
		<div className="flex items-center space-x-2 max-w-sm">
			<Checkbox />
			<Label className="font-normal cursor-pointer">I agree to the terms and conditions</Label>
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<div className="space-y-2 max-w-sm">
			<Label>
				Full Name
				<span className="text-danger ml-1">*</span>
			</Label>
			<Input placeholder="Enter your full name" />
		</div>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className="space-y-1 max-w-sm">
			<Label>Password</Label>
			<Input type="password" placeholder="Enter your password" />
			<p className="text-xs text-muted-foreground">Must be at least 8 characters long</p>
		</div>
	),
};

export const DisabledLabel: Story = {
	render: () => (
		<div className="space-y-2 max-w-sm opacity-50">
			<Label>Disabled Field</Label>
			<Input disabled defaultValue="Cannot edit" />
		</div>
	),
};

export const FormGroup: Story = {
	render: () => (
		<div className="space-y-6 max-w-sm">
			<div className="space-y-2">
				<Label>First Name</Label>
				<Input placeholder="John" />
			</div>
			<div className="space-y-2">
				<Label>Last Name</Label>
				<Input placeholder="Doe" />
			</div>
			<div className="space-y-2">
				<Label>Email</Label>
				<Input type="email" placeholder="john@example.com" />
			</div>
		</div>
	),
};
