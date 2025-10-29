import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@/components/core-ui/badge';
import { Check, AlertCircle } from 'lucide-react';

const meta = {
	component: Badge,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'A badge component for displaying labels, tags, or status indicators with multiple visual variants.',
			},
		},
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'outline', 'secondary', 'success', 'warning', 'info', 'danger'],
			description: 'The visual variant of the badge',
		},
		children: {
			control: 'text',
			description: 'Badge content',
		},
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		variant: 'default',
		children: 'Default',
	},
	render: (args) => <Badge {...args} />,
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">Default</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="success">Success</Badge>
			<Badge variant="warning">Warning</Badge>
			<Badge variant="info">Info</Badge>
			<Badge variant="danger">Danger</Badge>
		</div>
	),
};

export const Outline: Story = {
	args: {
		variant: 'outline',
		children: 'Outline',
	},
	render: (args) => <Badge {...args} />,
};

export const Secondary: Story = {
	args: {
		variant: 'secondary',
		children: 'Secondary',
	},
	render: (args) => <Badge {...args} />,
};

export const Success: Story = {
	args: {
		variant: 'success',
		children: 'Success',
	},
	render: (args) => <Badge {...args} />,
};

export const Warning: Story = {
	args: {
		variant: 'warning',
		children: 'Warning',
	},
	render: (args) => <Badge {...args} />,
};

export const Info: Story = {
	args: {
		variant: 'info',
		children: 'Info',
	},
	render: (args) => <Badge {...args} />,
};

export const Danger: Story = {
	args: {
		variant: 'danger',
		children: 'Danger',
	},
	render: (args) => <Badge {...args} />,
};

export const WithIcons: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="success">
				<Check className="size-3" />
				Approved
			</Badge>
			<Badge variant="warning">
				<AlertCircle className="size-3" />
				Pending
			</Badge>
			<Badge variant="danger">
				<AlertCircle className="size-3" />
				Error
			</Badge>
		</div>
	),
};

export const Status: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">Active:</span>
				<Badge variant="success">Online</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">Status:</span>
				<Badge variant="info">Processing</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">Alert:</span>
				<Badge variant="danger">Critical</Badge>
			</div>
		</div>
	),
};

export const Tags: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="secondary">React</Badge>
			<Badge variant="secondary">TypeScript</Badge>
			<Badge variant="secondary">Storybook</Badge>
			<Badge variant="secondary">Components</Badge>
		</div>
	),
};
