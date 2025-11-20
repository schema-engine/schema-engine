import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/core-ui/dialog';
import { Button } from '@/components/core-ui/button';

const meta = {
	component: Dialog,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A dialog component for displaying modal content built on Base UI.',
			},
		},
	},
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger>Open Dialog</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Dialog Title</DialogTitle>
					<DialogDescription>This is a dialog description. You can add any content here.</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<p>Dialog content goes here.</p>
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button>Confirm</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const Confirmation: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger>Delete Item</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Are you sure?</DialogTitle>
					<DialogDescription>
						This action cannot be undone. This will permanently delete the item.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button variant="destructive">Delete</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const Form: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger>Open Form</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Name</label>
						<input
							type="text"
							placeholder="Enter your name"
							className="w-full px-3 py-2 border rounded-md"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Email</label>
						<input
							type="email"
							placeholder="Enter your email"
							className="w-full px-3 py-2 border rounded-md"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};
