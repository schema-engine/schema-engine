import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/core-ui/sheet';
import { Button } from '@/components/core-ui/button';

const meta = {
	component: Sheet,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A sheet component for displaying side panels.',
			},
		},
	},
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger>
				<Button>Open Sheet</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Sheet Title</SheetTitle>
					<SheetDescription>This is a sheet panel that slides in from the side.</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p>Sheet content goes here.</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const Right: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger>
				<Button>Open Right Sheet</Button>
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Right Panel</SheetTitle>
					<SheetDescription>This sheet slides in from the right side.</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p>Right panel content</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const Top: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger>
				<Button>Open Top Sheet</Button>
			</SheetTrigger>
			<SheetContent side="top">
				<SheetHeader>
					<SheetTitle>Top Panel</SheetTitle>
					<SheetDescription>This sheet slides in from the top.</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p>Top panel content</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const Bottom: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger>
				<Button>Open Bottom Sheet</Button>
			</SheetTrigger>
			<SheetContent side="bottom">
				<SheetHeader>
					<SheetTitle>Bottom Panel</SheetTitle>
					<SheetDescription>This sheet slides in from the bottom.</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p>Bottom panel content</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};
