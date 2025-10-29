import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertTitle, AlertDescription } from '@/components/core-ui/alert';
import { AlertCircle, CheckCircle, InfoIcon, AlertTriangle } from 'lucide-react';

const meta = {
	component: Alert,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'An alert component for displaying messages with different severity levels.',
			},
		},
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'warning', 'danger', 'info', 'success'],
			description: 'The alert variant',
		},
	},
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		variant: 'default',
	},
	render: (args) => (
		<Alert {...args}>
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Default Alert</AlertTitle>
			<AlertDescription>This is a default alert message.</AlertDescription>
		</Alert>
	),
};

export const InfoAlert: Story = {
	args: {
		variant: 'info',
	},
	render: (args) => (
		<Alert {...args}>
			<InfoIcon className="h-4 w-4" />
			<AlertTitle>Information</AlertTitle>
			<AlertDescription>This is an informational message for the user.</AlertDescription>
		</Alert>
	),
};

export const Success: Story = {
	args: {
		variant: 'success',
	},
	render: (args) => (
		<Alert {...args}>
			<CheckCircle className="h-4 w-4" />
			<AlertTitle>Success</AlertTitle>
			<AlertDescription>Your action was completed successfully.</AlertDescription>
		</Alert>
	),
};

export const Warning: Story = {
	args: {
		variant: 'warning',
	},
	render: (args) => (
		<Alert {...args}>
			<AlertTriangle className="h-4 w-4" />
			<AlertTitle>Warning</AlertTitle>
			<AlertDescription>Please review this warning before proceeding.</AlertDescription>
		</Alert>
	),
};

export const Danger: Story = {
	args: {
		variant: 'danger',
	},
	render: (args) => (
		<Alert {...args}>
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>An error occurred. Please try again.</AlertDescription>
		</Alert>
	),
};

export const NoIcon: Story = {
	args: {
		variant: 'default',
	},
	render: (args) => (
		<Alert {...args}>
			<AlertTitle>Alert without Icon</AlertTitle>
			<AlertDescription>This alert does not have an icon.</AlertDescription>
		</Alert>
	),
};
