import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@/components/core-ui/input';
import { Search, Eye, AlertCircle } from 'lucide-react';

const meta = {
	component: Input,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'An input field component with support for icons and custom styling.',
			},
		},
	},
	argTypes: {
		type: {
			control: 'text',
			description: 'Input type attribute',
		},
		placeholder: {
			control: 'text',
			description: 'Placeholder text',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable the input',
		},
		leadingIcon: {
			description: 'Icon displayed on the left side',
		},
		trailingIcon: {
			description: 'Icon displayed on the right side',
		},
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Enter text...',
		type: 'text',
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="space-y-2 max-w-sm">
			<label className="text-sm font-medium">Email Address</label>
			<Input type="email" placeholder="john@example.com" />
		</div>
	),
};

export const WithLeadingIcon: Story = {
	render: () => (
		<div className="space-y-4 max-w-sm">
			<Input placeholder="Search..." leadingIcon={<Search />} />
			<Input placeholder="Search users..." leadingIcon={<Search />} />
		</div>
	),
};

export const WithTrailingIcon: Story = {
	render: () => (
		<div className="space-y-4 max-w-sm">
			<Input type="password" placeholder="Enter password" trailingIcon={<Eye className="cursor-pointer" />} />
			<Input type="email" placeholder="Enter email" trailingIcon={<AlertCircle />} />
		</div>
	),
};

export const InputTypes: Story = {
	render: () => (
		<div className="space-y-4 max-w-sm">
			<div>
				<label className="text-xs font-medium">Text</label>
				<Input type="text" placeholder="Enter text" />
			</div>
			<div>
				<label className="text-xs font-medium">Email</label>
				<Input type="email" placeholder="Enter email" />
			</div>
			<div>
				<label className="text-xs font-medium">Password</label>
				<Input type="password" placeholder="Enter password" />
			</div>
			<div>
				<label className="text-xs font-medium">Number</label>
				<Input type="number" placeholder="Enter number" />
			</div>
			<div>
				<label className="text-xs font-medium">URL</label>
				<Input type="url" placeholder="https://example.com" />
			</div>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="space-y-4 max-w-sm">
			<div>
				<label className="text-xs font-medium">Disabled</label>
				<Input disabled placeholder="This is disabled" />
			</div>
			<div>
				<label className="text-xs font-medium">Disabled with value</label>
				<Input disabled defaultValue="Cannot edit this" />
			</div>
		</div>
	),
};

export const WithError: Story = {
	render: () => (
		<div className="space-y-2 max-w-sm">
			<label className="text-sm font-medium">Email Address</label>
			<Input
				type="email"
				placeholder="john@example.com"
				trailingIcon={<AlertCircle className="text-danger-foreground" />}
			/>
			<p className="text-xs text-danger-foreground">Invalid email format</p>
		</div>
	),
};
