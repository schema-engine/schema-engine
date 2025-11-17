import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/core-ui/avatar';

const meta = {
	component: Avatar,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'An avatar component for displaying user profile images with fallback text.',
			},
		},
	},
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Avatar>
			<AvatarImage src="https://github.com/andeeplus.png" alt="user" />
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	),
};

export const Fallback: Story = {
	render: () => (
		<Avatar>
			<AvatarFallback>AB</AvatarFallback>
		</Avatar>
	),
};

export const Multiple: Story = {
	render: () => (
		<div className="flex -space-x-2">
			<Avatar>
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>AB</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>CD</AvatarFallback>
			</Avatar>
		</div>
	),
};
