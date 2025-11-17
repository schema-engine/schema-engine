import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/core-ui/table';

const meta = {
	component: Table,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A table component for displaying tabular data.',
			},
		},
	},
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>John Doe</TableCell>
					<TableCell>john@example.com</TableCell>
					<TableCell>Active</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Jane Smith</TableCell>
					<TableCell>jane@example.com</TableCell>
					<TableCell>Active</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Bob Johnson</TableCell>
					<TableCell>bob@example.com</TableCell>
					<TableCell>Inactive</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};

export const WithActions: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Product</TableHead>
					<TableHead>Price</TableHead>
					<TableHead>Quantity</TableHead>
					<TableHead>Total</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>Laptop</TableCell>
					<TableCell>$999</TableCell>
					<TableCell>2</TableCell>
					<TableCell>$1998</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Mouse</TableCell>
					<TableCell>$29</TableCell>
					<TableCell>5</TableCell>
					<TableCell>$145</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>Keyboard</TableCell>
					<TableCell>$79</TableCell>
					<TableCell>3</TableCell>
					<TableCell>$237</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};

export const Striped: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>ID</TableHead>
					<TableHead>Name</TableHead>
					<TableHead>Role</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow className="bg-muted/50">
					<TableCell>001</TableCell>
					<TableCell>Alice</TableCell>
					<TableCell>Designer</TableCell>
				</TableRow>
				<TableRow>
					<TableCell>002</TableCell>
					<TableCell>Bob</TableCell>
					<TableCell>Developer</TableCell>
				</TableRow>
				<TableRow className="bg-muted/50">
					<TableCell>003</TableCell>
					<TableCell>Charlie</TableCell>
					<TableCell>Manager</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};
