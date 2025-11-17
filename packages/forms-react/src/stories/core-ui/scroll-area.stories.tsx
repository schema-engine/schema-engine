import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from '@/components/core-ui/scroll-area';

const meta = {
	component: ScrollArea,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A scroll area component for handling overflow content.',
			},
		},
	},
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<ScrollArea className="h-64 w-64 rounded-md border p-4">
			<div className="space-y-4">
				{Array.from({ length: 20 }).map((_, i) => (
					<div key={i} className="text-sm">
						Item {i + 1}
					</div>
				))}
			</div>
		</ScrollArea>
	),
};

export const Horizontal: Story = {
	render: () => (
		<ScrollArea className="w-96 h-32 rounded-md border">
			<div className="flex gap-4 p-4">
				{Array.from({ length: 20 }).map((_, i) => (
					<div key={i} className="min-w-max text-sm">
						Item {i + 1}
					</div>
				))}
			</div>
		</ScrollArea>
	),
};

export const List: Story = {
	render: () => (
		<ScrollArea className="h-72 w-72 rounded-md border">
			<div className="p-4">
				<h4 className="mb-4 text-sm font-medium leading-none">Items</h4>
				{Array.from({ length: 30 }).map((_, i) => (
					<div key={i} className="text-sm py-2 px-2 hover:bg-muted rounded cursor-pointer">
						Item {i + 1}
					</div>
				))}
			</div>
		</ScrollArea>
	),
};
