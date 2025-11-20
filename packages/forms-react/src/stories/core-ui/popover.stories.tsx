import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/core-ui/popover';
import { Button } from '@/components/core-ui/button';

const meta = {
	component: Popover,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A popover component for displaying content in a floating container.',
			},
		},
	},
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger>
				<Button>Open Popover</Button>
			</PopoverTrigger>
			<PopoverContent>
				<div className="space-y-2">
					<h4 className="font-medium">Popover Title</h4>
					<p className="text-sm text-muted-foreground">This is the popover content.</p>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger>
				<Button variant="outline">Settings</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="space-y-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Settings</h4>
						<p className="text-sm text-muted-foreground">Configure your preferences</p>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Notifications</label>
						<input type="checkbox" defaultChecked />
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className="flex gap-2">
			<Popover>
				<PopoverTrigger>
					<Button size="sm">Info</Button>
				</PopoverTrigger>
				<PopoverContent className="w-64">
					<p className="text-sm">Information content</p>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger>
					<Button size="sm" variant="secondary">
						Details
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-64">
					<p className="text-sm">Details content</p>
				</PopoverContent>
			</Popover>
		</div>
	),
};
