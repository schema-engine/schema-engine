import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from '@/components/core-ui/slider';

const meta = {
	component: Slider,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component: 'A slider component for selecting values from a range.',
			},
		},
	},
	argTypes: {
		defaultValue: {
			control: 'number',
			description: 'Default value',
		},
	},
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
	args: {
		defaultValue: [50],
		min: 0,
		max: 100,
		step: 1,
	},
	render: (args) => (
		<div className="w-full max-w-sm space-y-4">
			<Slider {...args} />
			<p className="text-sm text-muted-foreground">Value: {args.defaultValue}</p>
		</div>
	),
};

export const Range: Story = {
	render: () => (
		<div className="w-full max-w-sm">
			<Slider defaultValue={[25, 75]} min={0} max={100} step={1} />
		</div>
	),
};

export const Step: Story = {
	render: () => (
		<div className="w-full max-w-sm space-y-4">
			<div>
				<p className="text-sm font-medium mb-2">Step: 1</p>
				<Slider defaultValue={[50]} step={1} />
			</div>
			<div>
				<p className="text-sm font-medium mb-2">Step: 10</p>
				<Slider defaultValue={[50]} step={10} />
			</div>
			<div>
				<p className="text-sm font-medium mb-2">Step: 25</p>
				<Slider defaultValue={[50]} step={25} />
			</div>
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="w-full max-w-sm opacity-50">
			<Slider defaultValue={[50]} disabled />
		</div>
	),
};
