import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/core-ui/tooltip';
import { Button } from '@/components/core-ui/button';

const meta = {
	component: Tooltip,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A tooltip component for displaying contextual information.',
			},
		},
	},
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>This is a tooltip</TooltipContent>
		</Tooltip>
	),
};

export const WithContent: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger>
				<Button>Help</Button>
			</TooltipTrigger>
			<TooltipContent>Click this button to get more information about this feature.</TooltipContent>
		</Tooltip>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className="flex gap-4">
			<Tooltip>
				<TooltipTrigger>
					<Button variant="ghost">Save</Button>
				</TooltipTrigger>
				<TooltipContent>Save your changes (Ctrl+S)</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger>
					<Button variant="ghost">Delete</Button>
				</TooltipTrigger>
				<TooltipContent>Delete this item</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger>
					<Button variant="ghost">Edit</Button>
				</TooltipTrigger>
				<TooltipContent>Edit this item</TooltipContent>
			</Tooltip>
		</div>
	),
};
