import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/core-ui/card';
import { Button } from '@/components/core-ui/button';

const meta = {
	component: Card,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A card component for displaying content in a contained, elevated container.',
			},
		},
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className="max-w-sm">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>This is a basic card example</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Cards are used to group related content and actions in a contained format. They provide visual
					separation and hierarchy.
				</p>
			</CardContent>
		</Card>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Card className="max-w-sm">
			<CardHeader>
				<CardTitle>Sign Up</CardTitle>
				<CardDescription>Create a new account to get started</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Join our community and start exploring all the features.
				</p>
			</CardContent>
			<CardFooter className="px-6 py-4 flex gap-2 border-t">
				<Button variant="outline" className="flex-1">
					Cancel
				</Button>
				<Button className="flex-1">Sign Up</Button>
			</CardFooter>
		</Card>
	),
};

export const WithAction: Story = {
	render: () => (
		<Card className="max-w-sm">
			<CardHeader>
				<CardTitle>Settings</CardTitle>
				<CardDescription>Manage your preferences</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4 text-sm">
					<div className="flex items-center justify-between">
						<span>Email Notifications</span>
						<input type="checkbox" defaultChecked className="cursor-pointer" />
					</div>
					<div className="flex items-center justify-between">
						<span>Marketing Emails</span>
						<input type="checkbox" className="cursor-pointer" />
					</div>
				</div>
			</CardContent>
		</Card>
	),
};

export const MultipleCards: Story = {
	render: () => (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Card 1</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">First card content</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Card 2</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Second card content</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Card 3</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Third card content</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Card 4</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">Fourth card content</p>
				</CardContent>
			</Card>
		</div>
	),
};
