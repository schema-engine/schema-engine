import type { Meta, StoryObj } from '@storybook/react-vite';
import { NumberField, NumberFieldScrubArea } from '@/components/core-ui/number-field';

const meta = {
	title: 'Core UI/NumberField',
	component: NumberField,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <NumberField defaultValue={5} />,
};

export const WithRange: Story = {
	render: () => <NumberField defaultValue={5} min={0} max={10} />,
};

export const Playground: Story = {
	args: {
		defaultValue: 5,
		min: 0,
		max: 100,
		step: 1,
	},
	render: (args) => <NumberField {...args} />,
};

export const WithScrubArea: Story = {
	render: () => (
		<NumberFieldScrubArea>
			<NumberField defaultValue={5} />
		</NumberFieldScrubArea>
	),
};

export const Disabled: Story = {
	render: () => <NumberField disabled defaultValue={5} />,
};
