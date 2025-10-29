import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from '@/components/core-ui/skeleton';

const meta = {
	component: Skeleton,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A skeleton loading component for representing placeholder content.',
			},
		},
	},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <Skeleton className="w-12 h-12 rounded-full" />,
};

export const Text: Story = {
	render: () => (
		<div className="space-y-2">
			<Skeleton className="w-full h-4" />
			<Skeleton className="w-full h-4" />
			<Skeleton className="w-3/4 h-4" />
		</div>
	),
};

export const Card: Story = {
	render: () => (
		<div className="p-4 border rounded-lg space-y-4">
			<Skeleton className="w-full h-40 rounded-lg" />
			<div className="space-y-2">
				<Skeleton className="w-full h-4" />
				<Skeleton className="w-3/4 h-4" />
			</div>
		</div>
	),
};

export const Avatar: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Skeleton className="w-12 h-12 rounded-full" />
			<div className="space-y-2 flex-1">
				<Skeleton className="w-32 h-4" />
				<Skeleton className="w-48 h-3" />
			</div>
		</div>
	),
};

export const List: Story = {
	render: () => (
		<div className="space-y-3">
			<div className="flex items-center gap-3">
				<Skeleton className="w-10 h-10 rounded" />
				<div className="space-y-1 flex-1">
					<Skeleton className="w-24 h-3" />
					<Skeleton className="w-32 h-2" />
				</div>
			</div>
			<div className="flex items-center gap-3">
				<Skeleton className="w-10 h-10 rounded" />
				<div className="space-y-1 flex-1">
					<Skeleton className="w-24 h-3" />
					<Skeleton className="w-32 h-2" />
				</div>
			</div>
			<div className="flex items-center gap-3">
				<Skeleton className="w-10 h-10 rounded" />
				<div className="space-y-1 flex-1">
					<Skeleton className="w-24 h-3" />
					<Skeleton className="w-32 h-2" />
				</div>
			</div>
		</div>
	),
};
