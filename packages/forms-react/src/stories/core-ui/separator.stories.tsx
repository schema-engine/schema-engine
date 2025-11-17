import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '@/components/core-ui/separator';

const meta = {
	component: Separator,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A separator component for dividing content visually.',
			},
		},
	},
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
			description: 'The orientation of the separator',
		},
	},
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		orientation: 'horizontal',
	},
	render: (args) => (
		<div className="space-y-4">
			<div>
				<h3 className="font-semibold">Section 1</h3>
			</div>
			<Separator {...args} />
			<div>
				<h3 className="font-semibold">Section 2</h3>
			</div>
		</div>
	),
};

export const Horizontal: Story = {
	args: {
		orientation: 'horizontal',
	},
	render: (args) => (
		<div className="space-y-4">
			<div>Item 1</div>
			<Separator {...args} />
			<div>Item 2</div>
		</div>
	),
};

export const Vertical: Story = {
	args: {
		orientation: 'vertical',
	},
	render: (args) => (
		<div className="flex items-center gap-4">
			<div>Item 1</div>
			<Separator {...args} className="h-6" />
			<div>Item 2</div>
		</div>
	),
};

export const InList: Story = {
	render: () => (
		<div className="w-full max-w-sm">
			<div className="py-2">Item 1</div>
			<Separator />
			<div className="py-2">Item 2</div>
			<Separator />
			<div className="py-2">Item 3</div>
		</div>
	),
};
