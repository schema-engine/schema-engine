import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogClose,
} from '@/components/core-ui/alert-dialog';
import { Button } from '@/components/core-ui/button';

const meta = {
	component: AlertDialog,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'An alert dialog component for important confirmations.',
			},
		},
	},
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger>
				<Button>Open Alert</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete your account.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogClose>Cancel</AlertDialogClose>
					<Button>Continue</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const Delete: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger>
				<Button variant="destructive">Delete Item</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Item?</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete this item? This action cannot be reversed.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogClose>Keep It</AlertDialogClose>
					<Button className="bg-destructive hover:bg-destructive/90">Delete</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};

export const Confirm: Story = {
	render: () => (
		<AlertDialog>
			<AlertDialogTrigger>
				<Button>Confirm Action</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm your action</AlertDialogTitle>
					<AlertDialogDescription>
						Please confirm that you want to proceed with this action.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogClose>Cancel</AlertDialogClose>
					<Button>Confirm</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
};
