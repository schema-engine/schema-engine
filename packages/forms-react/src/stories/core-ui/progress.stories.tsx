import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from '@/components/core-ui/progress';

const meta = {
	component: Progress,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A progress bar component for showing completion status.',
			},
		},
	},
	argTypes: {
		value: {
			control: 'number',
			min: 0,
			max: 100,
			description: 'Progress value (0-100)',
		},
	},
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		value: 50,
	},
	render: (args) => (
		<div className="w-full max-w-sm space-y-2">
			<Progress {...args} />
			<p className="text-xs text-muted-foreground">{args.value}%</p>
		</div>
	),
};

export const Empty: Story = {
	args: {
		value: 0,
	},
	render: (args) => <Progress {...args} />,
};

export const Half: Story = {
	args: {
		value: 50,
	},
	render: (args) => <Progress {...args} />,
};

export const Complete: Story = {
	args: {
		value: 100,
	},
	render: (args) => <Progress {...args} />,
};

export const Variants: Story = {
	args: {
		value: 50,
	},
	render: () => (
		<div className="w-full max-w-sm space-y-4">
			<div className="space-y-2">
				<p className="text-sm font-medium">0%</p>
				<Progress value={0} />
			</div>
			<div className="space-y-2">
				<p className="text-sm font-medium">25%</p>
				<Progress value={25} />
			</div>
			<div className="space-y-2">
				<p className="text-sm font-medium">50%</p>
				<Progress value={50} />
			</div>
			<div className="space-y-2">
				<p className="text-sm font-medium">75%</p>
				<Progress value={75} />
			</div>
			<div className="space-y-2">
				<p className="text-sm font-medium">100%</p>
				<Progress value={100} />
			</div>
		</div>
	),
};
